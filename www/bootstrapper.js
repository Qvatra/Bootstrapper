var newJson = null;
var oldJson = null;
var root = "cdvfile://localhost/persistent/";
var contentStack = [];
var contentToDeleteStack = []; 

                          // Save the restart url to localStorage
localStorage.setItem("restarturl", window.location.href);

if (forceAppInstallFromPackage) {
    trace('on device ready: clean install');
    document.addEventListener("deviceready", cleanInstallFromAppPackage, false);
} else {
    trace('on device ready: check for install');
    document.addEventListener("deviceready", check, false);
}
function trace(text) {
    if (debugInfo) {
        document.getElementById("statusPlace").innerHTML += "<br/>" + text;
        console.log(text);
    }
}
function out(text) {
    if (outInfo) {
        document.getElementById("output").innerHTML += "<br/>" + text;
    }
}
function outNoBr(text) {
    document.getElementById("output").innerHTML += text;
}
function fatalError(error) {
    out(fatalErrorMsg);
    trace(fatalErrorMsg + ', code: ' + error);
}
function progress(perc) {
    document.getElementById("downloadStatus").innerHTML = perc + '%';
}
function functionFailed(error) {
    if (typeof error === 'string' && error == 'failed to parse') {
        trace('failed to parse new json. Running current version...');
        out(updateFailed);
    } else if (error.code == 3) { //unaccessible
        out(noInternetMsg);
        trace('*** No access to the internet ***');
    } else if (error.code == 1) { //no file found
        out(noFileFoundMsg);
        trace('*** No file found ***');
    } else {
        trace(unknownError);
        out(unknownError);
        trace('Running current version...');
    }
    execute();
};
function removeExtention(str) {
    return str.substr(0, str.length - 4);
}

function check() {
    (new FileSys()).readJsonAsObject(appNameSpace, configName, jsonExists, noJsonFound);
}

//---first installation----------------------------------------------------------------------
function noJsonFound(error) {
    if (typeof error === 'string' && error == 'failed to parse') {
        trace('failed to parse embedded json.');
        fatalError(error);
    } else if (error.code == 1) {//file not found
        out(installMsg);
        trace(' *** no json found ***');
        out('Installeren app files...');
        (new Archiver()).unzip(window.location.href.replace("bootstrapper.html", embeddedApp), appNameSpace, unzippedApp, fatalError);

    } else fatalError(error);
}

// Serge: added function to do complete reinstall from app package. First remove packageFolder (www), then install.
//        If remove fails, also do install.
function cleanInstallFromAppPackage() {
    trace("cleanInstallFromAppPackage");
    out(installMsg);
    (new FileSys()).delDir(appNameSpace + '/' + packageFolder, installFromAppPackage, installFromAppPackage);
}

function installFromAppPackage() {
    trace("installFromAppPackage");
    out('Configureren applicatie folder...');
    (new FileSys()).mkDir(appNameSpace, appNameSpaceFolderEnsured, appNameSpaceFolderEnsured);
}

function appNameSpaceFolderEnsured() {
    trace("appNameSpaceFolderEnsured");
    out('Configureren applicatie files...');
    (new Archiver()).unzip(window.location.href.replace("bootstrapper.html", embeddedApp), appNameSpace, unzippedApp, fatalError);
}

function unzippedApp() {
    trace('Installing cordova files...');
    out('Configureren systeem files...');
    (new Archiver()).unzip(window.location.href.replace("bootstrapper.html", embeddedCordova), appNameSpace + '/' + packageFolder, unzippedCordova, fatalError);
}

function unzippedCordova() {
    trace('Copying json...');
    var jsonFile = window.location.href.replace("bootstrapper.html", configName);
    (new FileSys()).load(jsonFile, appNameSpace, configName, readEmbeddedJson, fatalError);
}

function readEmbeddedJson() {
    trace('Reading embedded json...');
    (new FileSys()).readJsonAsObject(appNameSpace, configName, gotEmbeddedJson, fatalError);
}

function gotEmbeddedJson(obj) {
    oldJson = obj;
    trace('--- embedded json version is: ' + oldJson.appVersion);

    trace('Unzipping content files...');
    unzipEmbeddedContent(-1, jsonExists, fatalError);
}

function unzipEmbeddedContent(counter, success, fail) { //init with -1
    var contentFileName;
    counter++;
    if (counter >= oldJson.content.length) {
        success(oldJson);
    } else {
        trace(oldJson.content[counter].name);
        contentFileName = oldJson.content[counter].name;
        // SvdO: old:     (new Archiver()).unzip(window.location.href.replace("bootstrapper.html", contentFileName), appNameSpace + '/' + packageFolder + '/' + removeExtention(contentFileName), unzipEmbeddedContent(counter, success, fail), fail);
        var contentZip = window.location.href.replace("bootstrapper.html", contentFileName);
        var contentUnzipFolder = appNameSpace + '/' + contentFolder;
        out('Configureren content files...');
        (new Archiver()).unzip(contentZip, contentUnzipFolder, unzipEmbeddedContent(counter, success, fail), fail);
    }
}

//---already installed----------------------------------------------------------------------
function jsonExists(obj) {
    //set redirection in browser history
    window.history.replaceState({}, 'home', 'cdvfile://localhost/persistent/' + appNameSpace + '/' + packageFolder + '/' + appEntry);

    if (oldJson == null) {
        oldJson = obj;
        trace('--- embedded json version is: ' + oldJson.appVersion);
    }

    out(searchUpdatesMsg);
    trace('Loading json from server...');
    (new FileSys()).load(serverDir + configName, appNameSpace + "/" + downloadDir, configName, newJsonLoaded, functionFailed);      //here if failed(no internet connection) - run
}

function newJsonLoaded() {
    trace('Reading newJson...');
    (new FileSys()).readJsonAsObject(appNameSpace + "/" + downloadDir, configName, compareHostVersion, functionFailed);
}

function compareHostVersion(obj) {
    newJson = obj;
    trace('--- newJson version is: ' + newJson.appVersion);

    if (newJson.hostAppVersion > oldJson.hostAppVersion) {
        navigator.notification.alert(hostOutOfDateMsg, executeOldOrQuit, 'Update', 'OK');
    } else {
        compareAppVersion();
    }
}

function executeOldOrQuit() {
    if (newJson.forceUpdate) {
        trace('Can not continue. You must update host first');
        out('Update App in app store');
        navigator.app.exitApp();
    } else {
        execute();
    }
}

function compareAppVersion() {
    if (newJson.appVersion > oldJson.appVersion) {
        checkContent();
        isUpdateForced();
    } else {
        trace('--- The latest version is already installed.');
        execute();
    }
}

function checkContent() {
    for (var j = 0; j < newJson.content.length; j++) {              //check for new content
        for (var i = 0; i < oldJson.content.length; i++) {
            if (newJson.content[j].name == oldJson.content[i].name) {
                if (newJson.content[j].version > oldJson.content[i].version && !newJson.content[j].delete) {
                    trace('content to update: ' + newJson.content[j].name);
                    newEntry();
                    break;
                } else break;                                         //brakes i-loop
            }
            if (i == oldJson.content.length - 1) {
                trace('new content: ' + newJson.content[j].name);
                newEntry();
            }
        }
    }
    function newEntry() {
        contentStack.push(newJson.content[j].name);
        newJson.appSize += newJson.content[j].size;                   //calculate summary size in bytes
    }

    for (var i = 0; i < oldJson.content.length; i++) {                          //check for content to delete
        for (var j = 0; j < newJson.content.length; j++) {
            if (newJson.content[i].name == oldJson.content[j].name) {
                if (newJson.content[i].delete && !oldJson.content[j].delete) {
                    trace('content to delete: ' + oldJson.content[j].name);
                    contentToDeleteStack.push(removeExtention(oldJson.content[j].name));
                }
                break;
            }
        }
    }
}

function isUpdateForced() {
    if (newJson.forceUpdate) {
        prepareContent();
    } else downloadPromt();
}

function downloadPromt() {
    navigator.notification.confirm(
        downloadConfirm + newJson.description,                  // message
        onConfirm,                                              // callback to invoke with index of button pressed
        'Update size: ' + newJson.appSize + ' kb, Download?',                                               // title
        ['Later', 'Yes']                                        // buttonLabels
    );
}

function onConfirm(buttonIndex) {
    if (buttonIndex == 2) {                                     //update app
        prepareContent();
    } else if (buttonIndex == 1 || buttonIndex == 0) {          //discard update
        trace('*** Update discarded. Running current version...');
        execute();
    }
}

function prepareContent() {
    loadAndUnzipContent(-1, deleteWWW, functionFailed);
}

function loadAndUnzipContent(counter, done, failed) { //init with -1;
    var contentFileName;
    counter++;
    if (counter >= contentStack.length) {
        done();
    } else {
        trace('downloading ' + contentStack[counter] + '...');
        out(downloadContent1 + contentStack[counter] + downloadContent2);
        (new FileSys()).load(encodeURI(newJson.updateDirUri) + contentStack[counter], appNameSpace + '/' + downloadDir, contentStack[counter],
            function () {    //success
                trace('Unzipping ' + contentStack[counter] + '...');
                document.getElementById("downloadStatus").innerHTML = "";
                contentFileName = contentStack[counter];
                // SvdO                (new Archiver()).unzip(root + appNameSpace + '/' + downloadDir + '/' + contentFileName, appNameSpace + '/' + packageFolder + '/' + removeExtention(contentFileName),
                var contentZip = root + appNameSpace + '/' + downloadDir + '/' + contentFileName;
                var contentUnzipFolder = appNameSpace + '/' + contentFolder;
                //trace("Unzipping content from " + contentZip + " to " + contentUnzipFolder);
                (new Archiver()).unzip(contentZip, contentUnzipFolder,
                    function () {   //success
                        loadAndUnzipContent(counter, done);
                    },
                    failed);    //failed to unzip
            },
            failed,      //failed to connect or no file found => run current
        progress);
    }
}

function deleteWWW() {
    trace('Deleting www folder...');
    (new FileSys()).delDir(appNameSpace + '/www', appDownload, functionFailed);
}

function appDownload() {
    out(downloadUpdateMsg);
    trace('Downloading app...');
    (new FileSys()).load(encodeURI(newJson.updateDirUri) + newJson.appName, appNameSpace + '/' + downloadDir, newJson.appName, unzipApp, functionFailed, progress);
}

function unzipApp() {
    trace('Unzipping app...');
    out("Uitpakken applicatie configuratie");
    document.getElementById("downloadStatus").innerHTML = "";
    (new Archiver()).unzip(root + appNameSpace + '/' + downloadDir + '/' + newJson.appName, appNameSpace, copyNewJson, functionFailed);
}

function copyNewJson() {
    trace('Updating current json file...');
    var jsonFile = encodeURI(root + appNameSpace + "/" + downloadDir + "/" + configName);
    (new FileSys()).load(jsonFile, appNameSpace, configName, removeTemp, functionFailed);
}

function removeTemp() {
    (new FileSys()).delDir(appNameSpace + '/' + downloadDir, removeContentAsync, functionFailed);
}

function removeContentAsync() {
    for (var i = 0; i < contentToDeleteStack.length; i++) {
        (new FileSys()).delDir(appNameSpace + '/' + packageFolder + '/' + contentToDeleteStack[i],
            function () {
                trace('removed content: ' + contentToDeleteStack[i]);
            }, functionFailed);
    }
    execute();
}

function execute() {
    if (!debugInfo) {
        out(startMsg);
        start();
    } else {
        trace('--- starting in 7 seconds...');
        setTimeout(start, 7000);
    }
    function start() {
        (new FileSys()).run(function () { }, fatalError);
    }
}

//-----------------------------------------------------------------------------------
var FileSys = function () { }
//-----------------------------------------------------------------------------------
FileSys.prototype = {
    delDir: function (path, success, fail) {
        var that = this;
        that.success = success;
        that.fail = fail;

        that.getFilesystem(function (fileSystem) {
            that.getFolder(fileSystem, path, function (folder) {
                folder.removeRecursively(function () {
                    trace(path + " removed recursively.");
                    typeof that.success === 'function' && that.success();
                }, function (error) {
                    trace("failed to remove folder: " + error.code);
                    typeof that.fail === 'function' && that.fail(error);
                });
            }, function (error) {
                trace("failed to get folder: " + error.code);
                typeof that.fail === 'function' && that.fail(error);
            });
        }, function (error) {
            trace("Failed to get filesystem: " + error.code);
            typeof that.fail === 'function' && that.fail(error);
        });
    },

    mkDir: function (path, success, fail) {
        var that = this;
        that.success = success;
        that.fail = fail;

        that.getFilesystem(function (fileSystem) {
            // create the folder if it does not exist
            that.getFolder(fileSystem, path, function (folder) {
                if (device.platform.toLowerCase() === 'ios') {
                    // Per http://stackoverflow.com/questions/23472899/phonegap-ios-prevent-documents-folder-backup-on-icloud
                    // set metadata on folder to not backup in iCloud
                    folder.setMetadata(function () {
                            trace(path + " metadata added to not backup in iCloud.");
                            typeof that.success === 'function' && that.success();
                        }, function (error) {
                            trace("failed to set metadata to prevent iCloud backup: " + error.code);
                            typeof that.fail === 'function' && that.fail(error);
                        },
                        { "com.apple.MobileBackup": 1});
                }
                typeof that.success === 'function' && that.success();
            }, function (error) {
                trace("failed to get folder: " + error.code);
                typeof that.fail === 'function' && that.fail(error);
            });
        }, function (error) {
            trace("Failed to get filesystem: " + error.code);
            typeof that.fail === 'function' && that.fail(error);
        });
    },

    readJsonAsObject: function (path, fileName, success, fail) {
        var that = this;
        that.success = success;
        that.fail = fail;

        that.getFilesystem(function (fileSystem) {
            that.getFolder(fileSystem, path, function (folder) {
                folder.getFile(configName, { create: false }, function (fileEntry) {
                    fileEntry.file(function (file) {
                        var reader = new FileReader();
                        reader.onloadend = function (evt) {
                            try {
                                var obj = JSON.parse(evt.target.result);
                            } catch (error) {
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

    fileExists: function (path, fileName, exists, notexists, fail) {
        var that = this;
        that.exists = exists;
        that.norexists = notexists;
        that.fail = fail;

        that.getFilesystem(function (fileSystem) {
            that.getFolder(fileSystem, path, function (folder) {
                folder.getFile(configName, { create: false }, function (fileEntry) {
                    fileEntry.file(function (file) {
                        var reader = new FileReader();
                        reader.onloadend = function (evt) {
                            typeof that.exists === 'function' && that.exists();
                        };
                    }, function (error) {
                        trace("Failed to get file, so it does not exist!");
                        typeof that.notexists === 'function' && that.notexists();
                    });
                }, function (error) {
                    trace("failed to get file, so it does not exists!");
                    typeof that.notexists === 'function' && that.notexists();
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

    //copyDir: function (srcDir, dstDir, success, fail) { //doesn't work with path file:///
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
    unzip: function (pathFrom, pathTo, success, fail) {
        var that = this;
        that.success = success;
        that.fail = fail;
        trace("Unzipping " + pathFrom + " to " + root + pathTo + "/");
        zip.unzip(pathFrom, root + pathTo + "/",
            function (code) {
                if (code < 0) {
                    trace("Unzip error result: " + code);
                    typeof that.fail === 'function' && that.fail('something went wrong during the unzip');
                } else {
                    trace("Unzipped successfully");
                    typeof that.success === 'function' && that.success();
                }
            },
            function (progressEvent) {
                //outNoBr(" - " + Math.round((progressEvent.loaded / progressEvent.total) * 100) + "%");
                outNoBr(".");
            }
        );
    }
}
//-----------------------------------------------------------------------------------
