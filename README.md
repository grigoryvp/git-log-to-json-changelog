# git-log-to-json-changelog
Reads git log and returns JSON suitable to generate a changelog like CHANGELOG.md

## W
as
## Usage

```sh
yarn install --dev git@github.com:grigoryvp/git-log-to-json-changelog.git
$(yarn bin)/git-log-to-json-changelog > changelog.json
```

## Syntax

Opinionated syntax is used. This tool will search git log for commits and tags that has text matched by `/\{[a-zA-Z][^\}]*\}/` regexp. Such text is assumed to be tool option. Inside `{` and `}` where can be key-value pairs separated with `;` character. Key is separated from value via `:` or `=`. Key or value that contain spaces or `{};:="` chars are enclosed in `"`. Inside `"`, `"` and `\` characters are escaped with `\`:
```
{readonly=true}
{readonly:true}
{lng:xi}
{lng:xi;file:foo.xi}
{push;name:"server 1";path:"ssh://www-data@eye.at.vu//var/www/www_eye"}
```

Following keys are supported:
* `group`, with a string value: group commit message and specified group, ch
