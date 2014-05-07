// FS
var appNameSpace = "zzz";                       //name of the root directory in FS
var packageFolder = "www";                      //subfolder where index.html would be unpacked
var downloadDir = "download";                   //temporary directory for downloads from server

//Embedded Files
var embeddedApp = "app.zip";
var embeddedCordova = "cordova.zip";
var appEntry = "index.html";

//Server Path
var serverDir = encodeURI("https://dl.dropboxusercontent.com/u/49691996/");
var configName = "version.json";

//UI
var debugInfo = false;
var installMsg = "Installing app... Please wait.";
var searchUpdatesMsg = "Searching for updates...";
var noInternetMsg = "No access to the internet.";
var downloadUpdateMsg = "Downloading update...";
var noFileFoundMsg = "No file found.";
var downloadConfirm = "New in update: ";
var downloadContent1 = "downloading ";              // 'downloading content1.zip...'
var downloadContent2 = "...";
var startMsg = "starting app...";
var fatalErrorMsg = "fatal error. App will not run.";
var hostOutOfDateMsg = "To use newest version please update app via web store.";
var updateFailed = "Update failed. Running current version...";
var unknownError = "Something went wrong.";