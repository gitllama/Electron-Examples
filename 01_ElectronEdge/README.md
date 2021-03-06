# ElectronEdge

1. VSでElectronDLLのビルド
1. ElectronDLL.DLLをmain.jsと同一フォルダに
1. npm install
1. npm start

で動くはず

## node

ElectronでEdgeを使用する場合、Ver管理が厳密なのでNodistなどでnodeのVer管理が便利です。

- Electron 1.4.x - Node.js v6.5.0.
- Electron 1.6.x - Node.js v7.4.0.
- Electron 1.7.x - Node.js v7.9.0.
- Electron 1.8.x - Node.js v8.2.1.
- Electron 2.0.x - Node.js v8.9.3.

## Verの変更方法

1. Verの追加 ```> nodist + 8.9.3```
1. Verの変更 ```> nodist 8.9.3```
1. Verに応じたnpmのVer選択 ```> nodist npm match```

## Electronの基礎

### 構成

決まり文句。

```npm start```でとりあえず動いてくれる  
dependencies, devDependenciesのものは自動的にPATHが通るので。


package.json
```
{
  "name": "electron-quick-start",
  "version": "1.0.0",
  "description": "A minimal Electron application",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  /*略*/
}
```

index.html
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hello World!</title>
</head>
<body>
    <h1>Hello World!</h1>

    We are using Node.js
    <script>document.write(process.versions.node)</script>,
    Chromium
    <script>document.write(process.versions.chrome)</script>,
    and Electron
    <script>document.write(process.versions.electron)</script>.

    <script>
      // You can also require other files to run in this process
      //require('./renderer.js')
    </script>
</body>
</html>
```

main.js
```javascript
const electron = require('electron')

const app = electron.app
const BrowserWindow = electron.BrowserWindow
const path = require('path');
const url = require('url');

let mainWindow
app.on('ready', function () {
    mainWindow = new BrowserWindow({ width: 800, height: 600 })
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))
    mainWindow.webContents.openDevTools()
    mainWindow.on('closed', function () {
        mainWindow = null
    })
})
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
})
```

### View-Logic間の通信

View-Logic間の通信手段としてipcが準備されています

index.html
```html
    <button id="myButton">ボタン</button>
    <script>
        const ipcRenderer = require("electron").ipcRenderer;
        const myButton = document.getElementById("myButton");
        var clickCount = 0;
        myButton.addEventListener("click", e => {
            ipcRenderer.send("click-my-button", ++clickCount);
        });
    </script>
```

main.js
```javascript
/*略*/

const ipcMain = electron.ipcMain;
ipcMain.on("click-my-button", (sender, e) => {
    console.log(e);
});
```

## Edge.jsの基礎

### スクリプト呼び出し

今回はelectron-edge-jsを使用したので```require('electron-edge-js')```  
edgeなら```require('edge')```electron-edgeなら```require('electron-edge')```で後の構文は共通となります

main.js
```javascript
const edge = require('electron-edge-js');

var sample1 = edge.func(function () {/*
   async (input) => "Hello " + input.ToString() + "!";
*/});
sample1('World', (error, result)=>{
   if (error) throw error;
   console.log(result);
});
```

```edge.func```でC#の構文を呼び出すのですが、当然Node.jsはC#の構文を解釈しないのでご解釈を避ける為```/**/```で囲まれているところがポイント。

ES6なら

```javascript
var edge = require('edge');
var helloWorld = edge.func(`
    async (input) => {
        return ".NET Welcomes " + input.ToString();
    }
`);
```

とかける。

### DLL呼び出し

上記ではC#のスクリプトをラムダ式として与えているがDLLとして呼び出す際には一癖ある。

#### C#側でラッピング

```edge.func()```でDLLファイルを指定した場合、DLL内の```Task<object> Invoke(object)```を参照して自動的に接続する。

```C#
    public class Startup
    {
        public async Task<object> Invoke(object input)
        {
            return this.Add6((int)input);
        }
        int Add6(int v)
        {
            return Helper.Add6(v);
        }
    }

    public static class Helper
    {
        public static int Add6(int v)
        {
            return v + 6;
        }
    }
```

```JavaScript
var ElectronDLL = edge.func('ElectronDLL.dll');
ElectronDLL(12, function (error, result) {
  if (error) throw error;
  console.log(result);
});
```

#### JavaScript側でラッピング

JavaScriptでスクリプトとして```Task<object> Invoke(object)```を記述しても当然同じ動きをする

```JavaScript
var ElectronDLL = edge.func({
    source: function() {/*
        using System.Threading.Tasks;
        public class Startup
        {
            public async Task<object> Invoke(object input)
            {
              //hogehoge
            }
        }
    */}
});
```

methodNameを直接引数として指定して登録もできるが、当然```Task<object> Invoke(object)```でないと呼び出せない

```JavaScript
var clrMethod = edge.func({
  assemblyFile: 'ElectronDLL.dll',
  typeName: 'ElectronDLL.Startup',
  methodName: 'Invoke' // This must be Func<object,Task<object>>
});
```

#### JavaScript側でReflectionを使ってラッピング

通常のDLLを呼び出す際、毎回それぞれの命令をInvokeでラッピングしてては手間なので、Reflectionで呼び出してみる

下記の例ではインスタンスを作らずstaticな命令を呼び出している。  
references引数でDLLを読み込んでいる。

```JavaScript
var ElectronDLL = edge.func({
    source: function() {/*
        using System;
        using System.Threading.Tasks;
        using System.Reflection;

        public class Startup
        {
            public async Task<object> Invoke(object input)
            {
              //Methodの列挙
              Type type = typeof(ElectronDLL.Helper);
              MemberInfo[] members = type.GetMembers();
              foreach (MemberInfo m in members)
                  Console.WriteLine("{0} - {1}", m.MemberType, m.Name);

              //object temporary = System.Activator.CreateInstance(type);
              MethodInfo methodinfo = type.GetMethod(((dynamic)input).Method);
              return methodinfo.Invoke(null, ((dynamic)input).parameters);
            　//return methodinfo.Invoke(temporary, ((dynamic)input).parameters);
            }
        }
    */},
    references: [
      'ElectronDLL.dll'
    ]
});

ElectronDLL({Method : "Add6", parameters : [12]}, function (error, result) {
	if (error) throw error;
	console.log(result);
});
```
