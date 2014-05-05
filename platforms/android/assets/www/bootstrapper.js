var newJson;
var oldJson;
var packageName;
var contentStack = [];
var contentToDeleteStack = [];

document.addEventListener("deviceready", check, false);

function trace(text) {
    if (debugInfo) {
        document.getElementById("statusPlace").innerHTML += "<br/>" + text;
        console.log(text);
    }
}

function out(text) {
    if (!debugInfo) {
        document.getElementById("output").innerHTML += "<br/>" + text;
    }
}

function check() {
    trace('Checking if json exists...');
    (new FileSys()).readJsonAsObject(appNameSpace, configName, jsonExists, noJsonFound);
}

//---first installation----------------------------------------------------------------------
function noJsonFound(error) {
    if (error.code == 1) {//file not found
        out(installMsg);
        trace(' *** no json found ***');
        trace('Installing app files...');
        (new Archiver()).unzipEmbedded(embeddedApp, appNameSpace, unzippedApp, fail);

    } else fail(error);
}

function unzippedApp() {
    trace('Installing cordova files...');
    (new Archiver()).unzipEmbedded(embeddedCordova, appNameSpace + '/' + packageFolder, unzippedCordova, fail);
}

function unzippedCordova() {
    trace('Copying json...');
    var jsonFile = window.location.href.replace("bootstrapper.html", configName);
    (new FileSys()).load(jsonFile, appNameSpace, configName, check, fail);
}

//---already installed----------------------------------------------------------------------
function jsonExists(obj) {
    oldJson = obj;
    trace('--- current json version is: ' + oldJson.packageVersion);

    out(searchUpdatesMsg);
    trace('Loading json from server...');
    (new FileSys()).load(serverDir + configName, appNameSpace + "/" + downloadDir, configName, newJsonLoaded, failToLoad);      //here if failed(no internet connection) - run
}

function failToLoad(error) {
    if (error.code == 3) { //unaccessible
        out(noInternetMsg);
        trace('*** No acces to the internet ***');
        execute();
    } else if (error.code == 1) { //no file found
        out(noFileFoundMsg);
        trace('*** No file found ***');
        execute();
    } else fail(error);
};

function newJsonLoaded() {
    trace('Reading newJson...');
    (new FileSys()).readJsonAsObject(appNameSpace + "/" + downloadDir, configName, gotNewJson, failedToParse);
}

function failedToParse(error) {
    if (error == "failed to parse") {
        trace('Running current version...');
        execute();
    } else {
        fail(error);
    }
}

function gotNewJson(obj) {
    newJson = obj;
    trace('--- newJson version is: ' + newJson.packageVersion);
    
    if (newJson.hostAppVersion != oldJson.hostAppVersion) {
        navigator.notification.alert(
            'Update package requires update of the hosted app.',
            execute,
            'Update not possible',
            'Cancel'
        );
    } else if (newJson.packageVersion > oldJson.packageVersion) {
        navigator.notification.confirm(
            downloadConfirm1 + newJson.packageSize + downloadConfirm2, // message
            onConfirm,                         // callback to invoke with index of button pressed
            'Update',                           // title
            ['Later', 'Yes']                    // buttonLabels
        );
    } else {
        trace('--- The latest version is already installed.');
        execute();
    }
}

function onConfirm(buttonIndex) {
    if (buttonIndex == 2) {         //update
        out(downloadUpdateMsg);
        trace('Downloading update...');
        var packageDirUri = encodeURI(newJson.packageDirUri);
        packageName = newJson.packageName;
        (new FileSys()).load(packageDirUri + packageName, appNameSpace, packageName, packageLoaded, failToLoad, progress);
    } else if (buttonIndex == 1 || buttonIndex == 0) {  //discard update
        trace('*** Update discarded. Running current version...');
        //execute();
        checkContent(addNewContent, function () { });
    }
}

function addNewContent() {
    loadAndUnzipContent(-1, function () { }, fail);
}


function packageLoaded() {
    trace('Unzipping package...');
    document.getElementById("downloadStatus").innerHTML = "";
    (new Archiver()).unzip(appNameSpace, packageName, packageUnzipped, fail);
}

function packageUnzipped() {
    trace('Updating current json file...');
    var jsonFile = encodeURI("cdvfile://localhost/persistent/" + appNameSpace + "/" + downloadDir + "/" + configName);
    (new FileSys()).load(jsonFile, appNameSpace, configName, execute, fail);
}

function checkContent(addNewContent, sameContent) {
    for (var j = 0; j < newJson.content.length; j++) {              //check for new content
        for (var i = 0; i < oldJson.content.length; i++) {
            if (newJson.content[j] == oldJson.content[i]) break;    //brakes i-loop
            if (i == oldJson.content.length - 1) {                  //new entry detected
                trace('new content: ' + newJson.content[j]);
                contentStack.push(newJson.content[j]);
            }
        }
    }
    if (contentStack.length != 0) {
        addNewContent();
    } else {
        sameContent();
    }

    //for (var i = 0; i < oldJson.content.length; i++) {              //check for content to delete
    //    for (var j = 0; j < newJson.content.length; j++) {
    //        if (newJson.content[i] == oldJson.content[j]) break;    //brakes j-loop
    //        if (j == newJson.content.length - 1) {                  //content to delete
    //            trace('content to delete: ' + oldJson.content[i]);
    //            contentToDeleteStack.push(oldJson.content[i]);
    //        }
    //    }
    //}
    //deleteOldContent(-1);
}

function loadAndUnzipContent(counter, success, fail) { //init with -1;
    counter++;
    if (counter >= contentStack.length) {
        success();
        return;
    }
    var packageDirUri = encodeURI(newJson.packageDirUri); //make separate func for init this
    trace('downloading ' + contentStack[counter] + '...');
    out(downloadContent1 + contentStack[counter] + downloadContent2);
    (new FileSys()).load(packageDirUri + contentStack[counter], appNameSpace + '/' + downloadDir, contentStack[counter],
        function () {   //success
            trace('Unzipping ' + contentStack[counter] + '...');
            document.getElementById("downloadStatus").innerHTML = "";
            (new Archiver()).unzip(appNameSpace + '/' + downloadDir, contentStack[counter],
                function () { //success
                    loadAndUnzipContent(counter);
                },
                fail          //fail
            );
        },
        failToLoad, //failed to connect => run current
    progress);
}

    //function deleteOldContent(counter) { //init with -1;
    //    counter++;
    //    if (counter >= contentToDeleteStack.length) return;
    //    deletefromFS(contentToDeleteStack[counter], deleteOldContent(counter));
    //}

function execute() {
    if (!debugInfo) {
        out(startMsg);
        start();
    } else {
        trace('--- starting in 5 seconds...');
        setTimeout(start, 5000);
    }
    function start() {
        (new FileSys()).run(function () { }, fail);
    }
}

    function progress(perc) {
        document.getElementById("downloadStatus").innerHTML = perc + '%';
    }

    function fail(error) {
        trace('fail with error: ' + error);
    }

    //-----------------------------------------------------------------------------------
    var FileSys = function () { }
    //-----------------------------------------------------------------------------------
    FileSys.prototype = {
        readJsonAsObject: function (uri, fileName, success, fail) {
            var that = this;
            that.success = success;
            that.fail = fail;

            that.getFilesystem(function (fileSystem) {
                that.getFolder(fileSystem, uri, function (folder) {
                    folder.getFile(configName, { create: false }, function (fileEntry) {
                        fileEntry.file(function (file) {
                            var reader = new FileReader();
                            reader.onloadend = function (evt) {
                                try {
                                    var obj = JSON.parse(evt.target.result);
                                } catch (error) {
                                    trace("failed to parse json file: " + error.code);
                                    typeof that.fail === 'function' && that.fail("failed to parse");
                                    return;
                                }
                                typeof that.success === 'function' && that.success(obj);
                            };
                            reader.readAsText(file);
                        }, function (error) {
                            trace("Failed to get file");
                            typeof that.fail === 'function' && that.fail(error);
                        });
                    }, function (error) {
                        trace("failed to get file: " + error.code);
                        typeof that.fail === 'function' && that.fail(error);
                    });
                }, function (error) {
                    trace("failed to get folder: " + error.code);
                    typeof that.fail === 'function' && that.fail(error);
                });
            }, function (error) {
                trace("failed to get filesystem: " + error.code);
                typeof that.fail === 'function' && that.fail(error);
            });
        },

        load: function (uri, folderName, fileName, success, fail, progress) {
            var that = this;
            that.progress = progress;
            that.success = success;
            that.fail = fail;
            filePath = "";

            that.getFilesystem(
                    function (fileSystem) {
                        that.getFolder(fileSystem, folderName, function (folder) {
                            filePath = folder.toURL() + "/" + fileName;
                            that.transferFile(uri, filePath, progress, success, fail);
                        }, function (error) {
                            trace("Failed to get folder: " + error.code);
                            typeof that.fail === 'function' && that.fail(error);
                        });
                    },
                    function (error) {
                        trace("Failed to get filesystem: " + error.code);
                        typeof that.fail === 'function' && that.fail(error);
                    }
            );
        },

        //copyDir: function (srcDir, dstDir, success, fail) { //doesn't work woth path file:///
        //    var that = this;
        //    that.success = success;
        //    that.fail = fail;
        //    filePath = "";

        //    that.getFilesystem(
        //        function (fileSystem) {
        //            var root = fileSystem.root;
        //            that.getFolder(fileSystem, srcDir, function (folder) {
        //                filePath = folder.toURL();
        //                trace('folder.toURL() ' + folder.toURL());
        //                folder.copyTo(root, dstDir, success, fail);
        //            }, function (error) {
        //                trace("Failed to get folder: " + error.code);
        //                typeof that.fail === 'function' && that.fail(error);
        //            });
        //        },
        //            function (error) {
        //                trace("Failed to get filesystem: " + error.code);
        //                typeof that.fail === 'function' && that.fail(error);
        //            }
        //    );
        //},

        getFilesystem: function (success, fail) {
            window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, success, fail);
        },

        getFolder: function (fileSystem, folderName, success, fail) {
            fileSystem.root.getDirectory(folderName, { create: true, exclusive: false }, success, fail)
        },

        transferFile: function (uri, filePath, progress, success, fail) {
            var that = this;
            that.progress = progress;
            that.success = success;
            that.fail = fail;

            var transfer = new FileTransfer();
            transfer.onprogress = function (progressEvent) {
                if (progressEvent.lengthComputable) {
                    var perc = Math.floor(progressEvent.loaded / progressEvent.total * 100);
                    typeof that.progress === 'function' && that.progress(perc); // progression on scale 0..100 (percentage) as number
                } else {
                }
            };

            transfer.download(
                    uri,
                    filePath,
                    function (entry) {
                        trace("File saved to: " + entry.toURL());
                        typeof that.success === 'function' && that.success(entry);
                    },
                    function (error) {
                        trace("An error has occurred: Code = " + error.code);
                        trace("download error source " + error.source);
                        trace("download error target " + error.target);
                        trace("download error code " + error.code);
                        typeof that.fail === 'function' && that.fail(error);
                    }
            );
        },

        run: function (success, fail) {
            var that = this;
            that.success = success;
            that.fail = fail;

            that.getFilesystem(
            function (fileSystem) {
                that.getFolder(fileSystem, appNameSpace + "/" + packageFolder, function (folder) {
                    window.location = folder.nativeURL + "/index.html";
                    typeof that.success === 'function' && that.success();
                }, function (error) {
                    trace("failed to get folder: " + error.code);
                    typeof that.fail === 'function' && that.fail(error);
                });
            }, function (error) {
                trace("failed to get filesystem: " + error.code);
                typeof that.fail === 'function' && that.fail(error);
            });
        }
    }

    //-----------------------------------------------------------------------------------
    var Archiver = function () { }
    //-----------------------------------------------------------------------------------
    Archiver.prototype = {
        unzip: function (folderName, fileName, success, fail) {
            var that = this;
            that.success = success;
            that.fail = fail;

            zip.unzip("cdvfile://localhost/persistent/" + folderName + "/" + fileName,
                "cdvfile://localhost/persistent/" + appNameSpace + "/",
                    function (code) {
                        trace("result: " + code);
                        typeof that.success === 'function' && that.success();
                    }, function (error) {
                        trace("failed to get filesystem: " + error.code);
                        typeof that.fail === 'function' && that.fail(error);
                    }
            );
        },

        unzipEmbedded: function (name, path, success, fail) {
            var that = this;
            that.success = success;
            that.fail = fail;

            var zipfile = window.location.href.replace("bootstrapper.html", name);
            zip.unzip(zipfile, "cdvfile://localhost/persistent/" + path + '/',
                function (code) {

                    if (code < 0) {
                        trace("Unzip error result: " + code);
                        typeof that.fail === 'function' && that.fail('something went wrong during the unzip');
                    
                    } else {
                        trace("Unzipped successfully");
                        typeof that.success === 'function' && that.success();
                    }
                }
            );
        }
    }