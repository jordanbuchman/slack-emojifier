# slack-emojifier

## Installation

`npm install -g slack-emojifier`

**ImageMagick or GraphicsMagick must be installed!**

## Usage
```
Usage: emojify <command> [options]

Commands:
  create  Create and upload an emoji grid

Options:
  -s, --subdomain  Slack subdomain                           [string] [required]
  -e, --email      Slack account email address               [string] [required]
  -p, --password   Slack account password                    [string] [required]
  -i, --image      Path of the image to emojify              [string] [required]
  -n, --numcols    Number of columns in final grid           [number] [required]

Examples:
  emojify create -s mysubdomain -e         Create a 5-column emoji grid of
  my@email.com -p mypassword -i             myimage.png and upload to
  myimage.png -n 5                          mysubdomain.slack.com using the
                                            account my@email.com with the
                                            password mypassword.
```
