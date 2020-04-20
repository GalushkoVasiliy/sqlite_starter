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
  Platform,
  View,
  NativeModules,
  TouchableOpacity
} from 'react-native';

import SQLite from "react-native-sqlite-storage";
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const Aes = NativeModules.Aes;
const IOS = Platform.OS === 'ios';
const ANDROID = Platform.OS === 'android';
const IV = '1112131415161718';
const KEYPASS = 'password';

const generateKey = (password, salt, cost, length) => Aes.pbkdf2(password, salt, cost, length)

type _t_props = {|

|}

type _t_state = {|
  password: string,
  iv: string,
  data: [
    {
      BUSINESSFAMILY: string,
      RESTATED_BUS_SEG_DESC: string,
    }
  ],
|}

export default class App extends Component<_t_props, _t_state> {

  state = {
    password: '',
    iv: '',
    data: [],
  }

  openCB = () => {
    console.log('success');
  };

  errorCB = (err) => {
    console.log(err);
  };

  componentDidMount() {

    generateKey(KEYPASS, 'salt', 5000, 256).then(key => {
      this.setState(() => ({password: key}));

      Aes.randomKey(16).then((iv) => {
        this.setState(() => ({key: iv}))
        this.getDataFromSQLITE();
      });
    });

  }

  getDataFromSQLITE = async () => {
    const data = await SQLite.openDatabase({name : "testDB", createFromLocation : 1}, this.openCB,this.errorCB);

    const array = [];

    data.transaction((tx) => {
      tx.executeSql('SELECT * FROM METRICS', [], (tx, results) => {
        for (let i = 0; i < 10; i++) {
          let row = results.rows.item(i);

          let obj = {
            BUSINESSFAMILY: '',
            RESTATED_BUS_SEG_DESC: '',
          }

          this.encrypt(row.BUSINESSFAMILY).then((data) => {
            Aes.hmac256(data, KEYPASS).then(hash => {
              console.log('HMAC', hash)
            })

            obj.BUSINESSFAMILY = data;
            
          })

          this.encrypt(row.RESTATED_BUS_SEG_DESC).then((data) => {
            Aes.hmac256(data, KEYPASS).then(hash => {
              console.log('HMAC', hash)
            })
            
            obj.RESTATED_BUS_SEG_DESC = data;
          })
          array.push(obj);
        }
        this.setState(() => ({data: array}));
      });
    });

  }

  encrypt = (text) => {
    const {password, iv} = this.state;
    return Aes.encrypt(text, password, iv).then(cipher => cipher)
  }

  decrypt = (text) => {
    const {password, iv} = this.state;
    return Aes.decrypt(text, password, iv);
  }

  logWithDecrypt = () => {
    const {data, key} = this.state;
    data.forEach((element) => {
      this.decrypt(element.BUSINESSFAMILY)
        .then(text => {
            console.log('Decrypted:', text)
          })
          .catch(error => {
              console.log(error)
          })
      this.decrypt(element.RESTATED_BUS_SEG_DESC)
        .then(text => {
            console.log('Decrypted:', text)
          })
          .catch(error => {
              console.log(error)
          })
    });
  }

  render() {
    return(
      <SafeAreaView>
        <View>
          <Text>Hello</Text>
          <TouchableOpacity
            onPress={this.logWithDecrypt}
          >
            <Text>With decrypt</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }
}
