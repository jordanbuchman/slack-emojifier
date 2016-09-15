#!/usr/bin/env node

var emojipacks = require('emojipacks');
var glob = require("glob");
var localtunnel = require("localtunnel");
var path = require('path');
var os = require('os');
var sizeOf = require('image-size');
var cp = require( 'child_process');
var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var fs = require('fs');
var rimraf = require('rimraf');

var argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .command('create', 'Create and upload an emoji grid')
    .example('$0 create -s mysubdomain -e my@email.com -p mypassword -i myimage.png -n 5', 'Create a 5-column emoji grid of myimage.png and upload to mysubdomain.slack.com using the account my@email.com with the password mypassword.')
    .option('s', {
        alias: 'subdomain',
        demand: true,
        describe: 'Slack subdomain',
        type: 'string'
    })
    .option('e', {
        alias: 'email',
        demand: true,
        describe: 'Slack account email address',
        type: 'string'
    })
    .option('p', {
        alias: 'password',
        demand: true,
        describe: 'Slack account password',
        type: 'string'
    })
    .option('i', {
        alias: 'image',
        demand: true,
        describe: 'Path of the image to emojify',
        type: 'string'
    })
    .option('n', {
        alias: 'numcols',
        demand: true,
        describe: 'Number of columns in final grid',
        type: 'number'
    })
    .argv;

if (argv._ != 'create'){
  process.exit();
}

if(fs.existsSync(path.join('/tmp','slack_emojifier'))){
  rimraf.sync(path.join('/tmp','slack_emojifier'));
}

fs.mkdirSync(path.join('/tmp','slack_emojifier'));

var name = path.basename(process.argv[5]).split('.')[0]

var num_cols = parseInt(process.argv[6])

var serve = serveStatic(path.join('/tmp','slack_emojifier'));

var server = http.createServer(function(req, res) {
  var done = finalhandler(req, res);
  serve(req, res, done);
});

server.listen(5000);

var dimensions = sizeOf(process.argv[5]);

var emoji_size = parseInt(dimensions.width/num_cols);

convert = cp.execSync('convert '+ process.argv[5] +' -crop '+emoji_size+'x'+emoji_size+' -set filename:tile "%[fx:ceil(page.x/'+emoji_size+'+1)]_%[fx:ceil(page.y/'+emoji_size+'+1)]" +repage +adjoin "'+path.join('/tmp','slack_emojifier',name)+'_%[filename:tile].png"')
var tunnel = localtunnel(5000, function(err, tunnel) {
    if (err){
      return;
    }

  glob(path.join("/tmp","slack_emojifier/")+"*.*", function (er, files) {
    var emojis = []

    files.sort(function(a, b) {
      var a_match = a.match(/_(\d+)_(\d+)/);
      var b_match = b.match(/_(\d+)_(\d+)/);

      var y_sort = parseInt(a_match[2]) - parseInt(b_match[2]);
      if (y_sort == 0){
        return parseInt(a_match[1]) - parseInt(b_match[1]);
      }
      else{
        return y_sort;
      }

    });
    files.forEach(function(file){
      cp.exec("convert "+ file +" -resize "+emoji_size+'x'+emoji_size+" -background 'rgba(0,0,0,0)' -gravity NorthWest -extent "+emoji_size+'x'+emoji_size+" "+file, function(err,stdout,stderr){
        cp.execSync("convert "+ file +" -resize "+128+'x'+128+" "+file);
      });

      var name = path.basename(file).split('.')[0]

      emojis.push({
        'src': tunnel.url+"/"+path.basename(file),
        'name': name
        })
    });
    var line = "";
    files.forEach(function(file){
      var emoji_name = path.basename(file).split('.')[0];
      if (/_1_\d+$/.test(emoji_name)){
        process.stdout.write(os.EOL)
      }
      process.stdout.write(":"+emoji_name+":");
    });
    process.stdout.write(os.EOL)
    emojipacks.upload(process.argv[2], process.argv[3], process.argv[4], emojis)
    return;
  });
})
