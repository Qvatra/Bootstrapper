Bootstrapper
============
Plug and play javascript for mobile devices that allows you to push updates/new content for your cordova project.


Platform
============
Android       - tested   
iOS           - not tested   
Windows phone - not tested   
 

Installation
============
1. Copy bootstrapper.html, bootstrapper.js and bootstrapperConfig.js to '../your_cordova_project/www'.
2. Set in '../your_cordova_project/config.xml' path to bootstrapper.html: <content src="bootstrapper.html" />.
3. add app.zip to '../your_cordova_project/www'. The archive app.zip should contain www directory with your app files.
4. add cordova.zip to '../your_cordova_project/www'. The archive should contain cordova.js, cordova_plugins.js and directory "plugins" with plugins. Note that all content of cordova.zip should correspont to the specific platform you are working with.
5. optionally content zip files could be added to '../your_cordova_project/www'. 
6. add version.json, app.zip and optionally content.zip to your update_server. DropBox is ok too :).
7. install all dependencies.

All of the added content would be unpacked at the first run of the application.


Dependencies
============
org.apache.cordova.dialogs   
org.apache.cordova.file   
org.apache.cordova.file-transfer   
org.chromium.zip   


Configuration of bootstrapperConfig.js
============
appNameSpace - root directory for your app in the device's File System.   
packageFolder - use 'www' for cordova projects.   
downloadDir - name of the temporary directory for downloads from server. Would be deleted after each update.   
embeddedApp - name of the zip file that contains www dir with your app.    
embeddedCordova - name of the zip file that contains platform cpecific cordova files and plugins.   
appEntry - entry point for your app.   
serverDir - URI to the directory on update_server.    
configName - name of the json file which contains info about updates.
