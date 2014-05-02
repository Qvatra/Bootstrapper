var newJson;
var oldJson;
var packageName;

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
        out('Installing app... Please wait.');
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

    out('Searching for updates...');
    trace('Loading json from server...');
    (new FileSys()).load(serverDir + configName, appNameSpace + "/serverJson", configName, newJsonLoaded, failToConnect);      //here if failed(no internet connection) - run
}

function failToConnect(error) {
    if (error.code == 3) { //unaccessible
        out('No access to the internet.');
        trace('*** No acces to the internet ***');
        execute();
    } else fail(error);
};

function newJsonLoaded() {
    trace('Reading newJson...');
    (new FileSys()).readJsonAsObject(appNameSpace + "/serverJson", configName, gotNewJson, failedToParse);
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
            'New version available(' + newJson.packageSize + ')! Download?', // message
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
        out('Downloading update...');
        trace('Downloading update...');
        var packageDirUri = encodeURI(newJson.packageDirUri);
        packageName = newJson.packageName;
        (new FileSys()).load(packageDirUri + packageName, appNameSpace, packageName, packageLoaded, failToConnect, progress);
    } else if (buttonIndex == 1) {  //discard update
        trace('*** Update discarded. Running current version...');
        execute();
    }
}

function packageLoaded() {
    trace('Unzipping package...');
    document.getElementById("downloadStatus").innerHTML = "";
    (new Archiver()).unzip(appNameSpace, packageName, packageUnzipped, fail);
}

function packageUnzipped() {
    trace('Updating current json file...');
    var jsonFile = encodeURI("cdvfile://localhost/persistent/" + appNameSpace + "/serverJson/" + configName);
    (new FileSys()).load(jsonFile, appNameSpace, configName, execute, fail);
}

function checkContent() {
    for (var j = 0; j < newJson.content.length; j++) {
        for (var i = 0; i < oldJson.content.length; i++) {
            if (newJson.content[j] == oldJson.content[i]) break;
            if (i == oldJson.content.length - 1) { //new entry detected
                trace('new content: ' + newJson.content[j]);
            }
        }
    }
}

function execute() {
    out('starting app...');
    trace('--- starting in 3 seconds...');
    setTimeout(start, 3000);
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