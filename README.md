# git-log-to-json-changelog
Reads git log and returns JSON suitable to generate a changelog like CHANGELOG.md

## Why

* I need a JSON file suitable for a tamplate system of my choice, for example PUG
* I need to be able to change existing changelog message in case of a typo or changes introduces by following commits

## Usage

```sh
yarn install --dev git@github.com:grigoryvp/git-log-to-json-changelog.git
$(yarn bin)/git-log-to-json-changelog > changelog.json
```

## Syntax

Opinionated syntax is used. This tool will search git log for commits and tags that has text matched by `/\{[a-zA-Z][^\}]*\}/` regexp. Such text is assumed to be tool option. Inside `{` and `}` where can be key-value pairs separated with `;` character. Key is separated from value via `:` or `=`. Key or value that contain spaces or `{};:="'` chars are enclosed in `"` or `'`. Inside `"`/`'`, `"`/`'` and `\` characters are escaped with `\`:
```
{readonly=true}
{readonly:true}
{lng:xi}
{lng:xi;file:foo.xi}
{push;name:"server 1";path:"ssh://www-data@eye.at.vu//var/www/www_eye"}
```

Following keys are supported:
* `msg`, with a string value: changelog message
* `tag`, with a string value: add specified tag to a commit message. Can be used to group them
* `amend`, with a string value: change a message for git commit with a specified hash
* `release`, with a string value: mark a new release. Normally used in tags, but can be used in commits.

## Commit messages examples
* Introduce a new feature:
  ```sh
  git commit -m "JIRA#123 {msg:'High definition audi support'; type: 'new'}"
  ```
* Add more code to that feature:
  ```sh
  git commit -m "JIRA#123 Fix crash on old iOS"
  ```
* Fix changelog typo:
  ```sh
  git commit -m "{amend:'9bfd53b', msg:'High definition audio support'}"
  ```
* Mark a release with short message:
  ```
  git commit -m "{release:'4.0.75', msg: 'This release introduce a high definition audio support'}"
