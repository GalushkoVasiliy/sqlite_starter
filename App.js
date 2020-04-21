/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {Component} from 'react';
import {
  SafeAreaView,
  Text,
  View,
  NativeModules,
  TouchableOpacity,
} from 'react-native';

import SQLite from 'react-native-sqlite-storage';
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const Aes = NativeModules.Aes;
const KEYPASS = 'password';
let iv;

const generateKey = (password, salt, cost, length) =>
  Aes.pbkdf2(password, salt, cost, length);

type _t_props = {||};

type _t_state = {|
  password: string,
  data: [
    {
      BUSINESSFAMILY: string,
      RESTATED_BUS_SEG_DESC: string,
    },
  ],
|};

export default class App extends Component<_t_props, _t_state> {
  state = {
    password: '',
    data: [],
  };

  openCB = () => {
    console.log('success');
  };

  errorCB = (err) => {
    console.log(err);
  };

  componentDidMount() {
    generateKey(KEYPASS, 'salt', 5000, 256).then((key) => {
      this.setState(() => ({password: key}));
    });
    Aes.randomKey(16).then((ivKey) => {
      iv = ivKey;
    });

    setTimeout(() => {
      this.getDataFromSQLITE();
    }, 2000);
  }

  getDataFromSQLITE = async () => {
    const data = await SQLite.openDatabase(
      {name: 'testDB', createFromLocation: 1},
      this.openCB,
      this.errorCB,
    );

    const array = [];
    data.transaction((tx) => {
      tx.executeSql('SELECT * FROM METRICS', [], (tx, results) => {
        for (let i = 0; i < 10; i++) {
          let row = results.rows.item(i);

          let obj = {
            BUSINESSFAMILY: '',
            RESTATED_BUS_SEG_DESC: '',
          };
          try {
            this.encrypt(row.BUSINESSFAMILY).then((encrypt) => {
              Aes.hmac256(encrypt, KEYPASS).then((hash) => {
                console.log('HMAC', hash);
              });
              obj.BUSINESSFAMILY = encrypt;
            });

            this.encrypt(row.RESTATED_BUS_SEG_DESC).then((encrypt) => {
              Aes.hmac256(encrypt, KEYPASS).then((hash) => {
                console.log('HMAC', hash);
              });
              obj.RESTATED_BUS_SEG_DESC = encrypt;
            });
          } catch (err) {
            console.log(err);
          }
          array.push(obj);
        }
        this.setState(() => ({data: array}));
      });
    });
  };

  encrypt = (text) => {
    const {password} = this.state;
    // console.log(iv, 'huy');
    return Aes.encrypt(text, password, iv).then((cipher) => cipher);
  };

  decrypt = (text) => {
    const {password} = this.state;
    try {
      return Aes.decrypt(text, password, iv);
    } catch (err) {
      console.log(err);
    }
  };

  logWithDecrypt = () => {
    const {data} = this.state;
    console.log(data);
    data.forEach((element) => {
      this.decrypt(element.BUSINESSFAMILY)
        .then((text) => {
          console.log('Decrypted:', text);
        })
        .catch((error) => {
          console.log(error);
        });
      this.decrypt(element.RESTATED_BUS_SEG_DESC)
        .then((text) => {
          console.log('Decrypted:', text);
        })
        .catch((error) => {
          console.log(error);
        });
    });
  };

  render() {
    return (
      <SafeAreaView>
        <View>
          <Text>Hello</Text>
          <TouchableOpacity onPress={this.logWithDecrypt}>
            <Text>With decrypt</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}
