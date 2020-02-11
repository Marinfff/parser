const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

require('custom-env').env();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

class Parser {
  constructor() {
    this.baseSiteUrl = process.env.baseSiteUrl;
    this.siteUrl = process.env.siteUrl;
    this.botUrl = process.env.botUrl;
    this.serverUrl = process.env.serverUrl;
    this.chat_id = process.env.chat_id;
    this.parseInterval = 10000;
    this.postUrls = [];
    this.oldUrls = []
  }

  sendToBot(text) {
    axios.post(this.botUrl, {
      chat_id: this.chat_id,
      text
    })
      .then(res => {
        console.log('Bot is ' + res.statusText)
      })
      .then(err => {
        console.log(err)
      })
  }

  parsePosts(html) {
    this.postUrls.push(
      ...cheerio
        .load(html)
        ('#js-ads-container .ads-list-photo-item-title a')
        .toArray()
        .map(item => this.baseSiteUrl + item.attribs.href)
        .filter(item => !item.includes('/booster'))
    )
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

  async getPosts(page) {
    return (
      await axios.get(this.siteUrl, {
        params: {page}
      })
    ).data
  }

  updateServerStatus() {
    axios.get(this.serverUrl)
      .catch(() => {
        console.log('Server is ok')
      })
  }

  parseSite() {
    setInterval(async () => {
      this.parsePosts(await this.getPosts(1));
      this.parsePosts(await this.getPosts(2));
      this.parsePosts(await this.getPosts(3));
      this.filterPosts();
      this.updateServerStatus();
    }, this.parseInterval)
  }
}

const parser = new Parser();

parser.parseSite();


module.exports = app;
