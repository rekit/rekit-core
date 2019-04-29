let prefix = null;

module.exports = {
  getPrefix() {
    return prefix;
  },
  setPrefix(p) {
    prefix = p;
    return p;
  },
};
