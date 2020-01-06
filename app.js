const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

require('custom-env').env()

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

class Parser {
  constructor() {
    this.baseSiteUrl = process.env.baseSiteUrl;
    this.siteUrl = process.env.siteUrl;
    this.botUrl = process.env.botUrl;
    this.chat_id = process.env.chat_id;
    this.parseInterval = 10000;
    this.postUrls = []
    this.oldUrls = []
  }

  sendToBot(text) {
    axios.post(this.botUrl, {
      chat_id: this.chat_id,
      text
    })
      .then(res => {
        console.log(res)
      })
      .then(err => {
        console.log(err)
      })
  }

  parsePosts(html) {
    this.postUrls = cheerio
      .load(html)
      ('#js-ads-container .ads-list-photo-item-title a')
      .toArray()
      .map(item => this.baseSiteUrl + item.attribs.href)
      .filter(item => !item.includes('/booster'))
  }

  getDiff() {
    return this.postUrls.filter(x => !this.oldUrls.includes(x));
  }

  filterPosts() {
    if (this.getDiff().length) {
      this.getDiff().forEach(item => {
        this.sendToBot(item)
      });
      this.oldUrls = this.postUrls
    }
  }

  parseSite() {
    setInterval(() => {
      axios.get(this.siteUrl)
        .then(res => {
          this.parsePosts(res.data);
          this.filterPosts()
        })
        .then(err => {
          console.log(err)
        })
    }, this.parseInterval)
  }
}

const parser = new Parser();

parser.parseSite();


module.exports = app;
