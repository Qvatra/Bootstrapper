var appNameSpace = "com.macaw.bootstrapper";
var packageFolder = "www";
var embeddedApp = "app.zip";
var embeddedCordova = 'cordova.zip';
var downloadDir = 'download';                   //temporary directory for downloads from server


var serverDir = encodeURI("https://dl.dropboxusercontent.com/u/49691996/");
var configName = "version.json";

var debugInfo = false;
var installMsg = "Installing app... Please wait.";
var searchUpdatesMsg = "Searching for updates...";
var noInternetMsg = 'No access to the internet.';
var downloadUpdateMsg = 'Downloading update...';
var noFileFoundMsg = 'No file found.';
var downloadConfirm1 = "New version available(";    //'New version available(273 kb)! Download?'     <br/> tags doesn't work here
var downloadConfirm2 = ")! Download?";               
var downloadContent1 = 'downloading ';              // 'downloading content1.zip...'
var downloadContent2 = '...';
var startMsg = 'starting app...';