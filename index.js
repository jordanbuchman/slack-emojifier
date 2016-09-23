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
var deasync = require('deasync');
var prompt = require('prompt');

var argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .command('create', 'Create and upload an emoji grid')
    .example('$0 create -s mysubdomain -e my@email.com -p mypassword -i myimage.png -n 5', 'Create a 5-column emoji grid of myimage.png and upload to mysubdomain.slack.com using the account my@email.com with the password mypassword.')
    .option('s', {
        alias: 'subdomain',
        describe: 'Slack subdomain',
        type: 'string'
    })
    .option('e', {
        alias: 'email',
        describe: 'Slack account email address',
        type: 'string'
    })
    .option('p', {
        alias: 'password',
        describe: 'Slack account password',
        type: 'string'
    })
    .option('i', {
        alias: 'image',
        describe: 'Path of the image to emojify',
        type: 'string'
    })
    .option('n', {
        alias: 'numcols',
        describe: 'Number of columns in final grid',
        type: 'number'
    })
    .help('h')
    .alias('h', 'help')
    .argv;

if (argv._ != 'create'){
  process.exit();
}

var schema = {
    properties: {
      s: {
        description: 'Slack subdomain',
        required: true
      },
      e: {
        description: 'Slack account email address',
        required: true
      },
      p: {
        description: 'Slack account password',
        required: true,
        hidden: true
      },
      i: {
        description: 'Path of the image to emojify',
        required: true
      },
      n: {
        description: 'Number of columns in final grid',
        required: true
      }
    }
  };
prompt.override = argv;
prompt.start();
promptGet = deasync(prompt.get);
argv = promptGet(schema);


if(fs.existsSync(path.join('/tmp','slack_emojifier'))){
  rimraf.sync(path.join('/tmp','slack_emojifier'));
}

fs.mkdirSync(path.join('/tmp','slack_emojifier'));

var name = path.basename(argv.i).split('.')[0]

var num_cols = parseInt(argv.n)

var serve = serveStatic(path.join('/tmp','slack_emojifier'));

var server = http.createServer(function(req, res) {
  var done = finalhandler(req, res);
  serve(req, res, done);
});

server.listen(5000);

var dimensions = sizeOf(argv.i);

var emoji_size = parseInt(dimensions.width/num_cols);

convert = cp.execSync('convert '+ argv.i +' -crop '+emoji_size+'x'+emoji_size+' -set filename:tile "%[fx:ceil(page.x/'+emoji_size+'+1)]_%[fx:ceil(page.y/'+emoji_size+'+1)]" +repage +adjoin "'+path.join('/tmp','slack_emojifier',name)+'_%[filename:tile].png"')
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
    emojipacks.upload(argv.s, argv.e, argv.p, emojis)
    return;
  });
})
