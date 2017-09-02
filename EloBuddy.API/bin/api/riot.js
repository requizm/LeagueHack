// Generated by CoffeeScript 1.10.0
(function() {
  var DL_NA, DL_PBE, RELEASELISTING_NA, RELEASELISTING_PBE, Riot, dl, fs, gzip, md5, request, util, zlib;

  request = require('request');

  util = require('util');

  fs = require('fs');

  dl = require('download');

  md5 = require('md5-file');

  zlib = require('zlib');

  gzip = zlib.createGzip();

  require('buffertools').extend();

  RELEASELISTING_NA = 'http://l3cdn.riotgames.com/releases/live/projects/lol_game_client/releases/releaselisting_NA';

  RELEASELISTING_PBE = 'http://l3cdn.riotgames.com/releases/pbe/projects/lol_game_client/releases/releaselisting_PBE';

  DL_NA = 'http://l3cdn.riotgames.com/releases/live/projects/lol_game_client/releases/%s/files/League%20of%20Legends.exe.compressed';

  DL_PBE = 'http://l3cdn.riotgames.com/releases/pbe/projects/lol_game_client/releases/%s/files/League%20of%20Legends.exe.compressed';

  Riot = (function() {
    Riot.hashArray = [];

    Riot.dlQueue = [];

    Riot.isLocked = false;

    Riot.version = null;

    function Riot(_versionInst) {
      var self;
      self = this;
      Riot.version = _versionInst;
      Riot.hashArray['NA'] = [];
      Riot.hashArray['PBE'] = [];
      setInterval(self.refresh, 60000);
      this.refresh(true);
      setInterval(self.dlWorker, 500);
      setInterval(self.updateIsUpdatedArray, 30000);
    }

    Riot.releaseListingToType = function(uri) {
      if (!!~uri.indexOf('pbe')) {
        return 'PBE';
      }
      return 'NA';
    };

    Riot.prototype.updateIsUpdatedArray = function() {
      var i, j, len, results, type, types;
      types = ['NA', 'PBE'];
      results = [];
      for (j = 0, len = types.length; j < len; j++) {
        type = types[j];
        results.push((function() {
          var l, ref, results1;
          results1 = [];
          for (i = l = 0, ref = Riot.hashArray[type].length - 1; 0 <= ref ? l <= ref : l >= ref; i = 0 <= ref ? ++l : --l) {
            results1.push(Riot.hashArray[type][i].updated = Riot.version.isUpdated(Riot.hashArray[type][i].hash));
          }
          return results1;
        })());
      }
      return results;
    };

    Riot.prototype.dlWorker = function() {
      var dir, endPoint, fullPath, fullPathUnpacked, j, len, ref, results, uri, uriObject;
      if (Riot.isLocked) {
        return false;
      }
      ref = Riot.dlQueue;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        uriObject = ref[j];
        endPoint = uriObject.type === 'PBE' ? DL_PBE : DL_NA;
        uri = util.format(endPoint, uriObject.version);
        dir = "files/" + uriObject.type + "/" + uriObject.version;
        fullPath = dir + "/League%20of%20Legends.exe.compressed";
        fullPathUnpacked = dir + "/League of Legends.exe";
        if (!fs.existsSync(fullPathUnpacked)) {
          console.log("Downloading " + uriObject.version + "...");
          fs.mkdir(dir, function() {
            Riot.isLocked = true;
            return new dl().get(uri).dest(dir + "/").run(function() {
              Riot.isLocked = false;
              return fs.readFile(fullPath, function(err, buff) {
                return zlib.unzip(buff, function(err, buf2) {
                  fs.writeFileSync(fullPathUnpacked, buf2);
                  return Riot.computeMD5Hashes(fullPathUnpacked, uriObject.version, uriObject.type);
                });
              });
            });
          });
        } else {
          console.log("Skipping download of '" + uriObject.version + "' - reason: file exists");
          Riot.computeMD5Hashes(fullPathUnpacked, uriObject.version, uriObject.type);
        }
        Riot.dlQueue.splice(0, 1);
        break;
      }
      return results;
    };

    Riot.computeMD5Hashes = function(fullPath, version, type) {
      var i, j, ref, results, versionObject;
      results = [];
      for (i = j = 0, ref = Riot.hashArray[type].length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
        versionObject = Riot.hashArray[type][i];
        if (versionObject.version === version && Riot.hashArray[type][i].hash.length !== 32) {
          results.push(Riot.hash(fullPath, type, i));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    Riot.hash = function(fullPath, type, i) {
      var begin, buildDate, fileBytes, j, k, version;
      console.log("Hashing: Version: " + version + " Type: " + type + "...");
      fileBytes = fs.readFileSync(fullPath);
      version = '';
      buildDate = '';
      begin = fileBytes.indexOf('Releases') + "Releases".length + 1;
      for (k = j = 0; j <= 2; k = ++j) {
        version += String.fromCharCode(fileBytes[k + begin]);
      }
      if (!~version.indexOf('.')) {
        version = 'Unknown';
      }
      md5(fullPath, function(err, sum) {
        if (!err) {
          Riot.hashArray[type][i].prettyVersion = version.replace(/\s/g, '').replace('\u0000', '');
          Riot.hashArray[type][i].hash = sum;
          return Riot.hashArray[type][i].updated = Riot.version.isUpdated(Riot.hashArray[type][i].hash);
        }
      });
      return console.info("Hash calculated... continuing");
    };

    Riot.prototype.refresh = function(initial) {
      var j, len, releaseListing, releaseListings, results;
      console.info('Refreshing Riot Hash Arrays...');
      releaseListings = [RELEASELISTING_NA, RELEASELISTING_PBE];
      results = [];
      for (j = 0, len = releaseListings.length; j < len; j++) {
        releaseListing = releaseListings[j];
        results.push(request(releaseListing, function(error, response, body) {
          var cmpVersion, l, len1, len2, m, ref, results1, version, versionExists, versionObject, versions;
          if (!error && response.statusCode === 200) {
            versions = body.split('\r\n').slice(0, 5);
            results1 = [];
            for (l = 0, len1 = versions.length; l < len1; l++) {
              version = versions[l];
              versionExists = false;
              ref = Riot.hashArray[Riot.releaseListingToType(response.request.href)];
              for (m = 0, len2 = ref.length; m < len2; m++) {
                cmpVersion = ref[m];
                if (cmpVersion.version === version) {
                  versionExists = true;
                }
              }
              versionObject = {
                version: version,
                prettyVersion: 'queued',
                updated: false,
                hash: 'queued'
              };
              if (!versionExists && !initial) {
                Riot.hashArray[Riot.releaseListingToType(response.request.href)].unshift(versionObject);
              }
              if (!versionExists && initial) {
                Riot.hashArray[Riot.releaseListingToType(response.request.href)].push(versionObject);
              }
              if (!versionExists) {
                Riot.dlQueue.push({
                  version: version,
                  type: Riot.releaseListingToType(response.request.href)
                });
              }
              if (!versionExists && !initial) {
                results1.push(console.info("Version " + version + " added to " + (Riot.releaseListingToType(response.request.href)) + "!"));
              } else {
                results1.push(void 0);
              }
            }
            return results1;
          }
        }));
      }
      return results;
    };

    Riot.prototype.getFileList = function(type) {
      return Riot.hashArray[type].slice(0, 5);
    };

    Riot.prototype.handle = function(request, response) {
      response.header('Access-Control-Allow-Origin', '*');
      return response.json({
        dlQueue: Riot.dlQueue.length,
        fileList: [
          {
            na: this.getFileList('NA'),
            pbe: this.getFileList('PBE')
          }
        ]
      });
    };

    return Riot;

  })();

  module.exports = Riot;

}).call(this);