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
1. Copy bootstrapper.html, bootstrapper.js and bootstrapperConfig.js to ../your_cordova_project/www
2. Set in ../your_cordova_project/config.xml path to bootstrapper.html: <content src="bootstrapper.html" />
3. add app.zip to ../your_cordova_project/www. The archive app.zip should contain www directory with your app files.
4. add cordova.zip to ../your_cordova_project/www. The archive should contain cordova.js, cordova_plugins.js and directory "plugins" with plugins. Note that all content of cordova.zip should correspont to the specific platform you are working with.
5. optionally content zip files could be added to ../your_cordova_project/www. 

All of the added content would be unpacked at the first run of the application.
