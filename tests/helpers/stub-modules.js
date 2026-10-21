"use strict";
/**
 * Offline test harness.
 *
 * The sandbox that built this package had NO network, so third-party modules
 * (mqtt, ws, axios, sequelize, ...) could not be installed. These stubs stand in
 * for them at the Module._load boundary ONLY. Anything that passes using these
 * stubs is a MOCKED test: it proves our logic against a fake transport, not
 * that Facebook accepts the traffic. Tests print which stubs they used.
 *
 * If a real copy of a module is installed (npm install), pass
 * TORU_REAL_DEPS=1 to skip stubbing it.
 */
const Module = require("module");
const EventEmitter = require("events");
const stream = require("stream");
const util = require("util");

const used = new Set();

class FakeMqttClient extends EventEmitter {
  constructor(streamBuilder, options) {
    super();
    this.options = options;
    this.connected = false;
    this.ended = false;
    this.subscribed = [];
    this.published = [];
    this.log = []; // ordered "subscribe:<t>" / "publish:<t>" / "suback:<t>" entries
    FakeMqttClient.instances.push(this);
  }
  subscribe(topic, cb) {
    this.subscribed.push(topic);
    this.log.push("subscribe:" + topic);
    // SUBACK arrives asynchronously, like a real broker
    setImmediate(() => { this.log.push("suback:" + topic); if (cb) cb(null, [{ topic, qos: 0 }]); });
  }
  unsubscribe(topic, cb) { setImmediate(() => cb && cb()); }
  publish(topic, payload, opts, cb) {
    this.published.push({ topic, payload });
    this.log.push("publish:" + topic);
    if (typeof opts === "function") opts(); else if (cb) cb();
  }
  end(force, cb) {
    if (typeof force === "function") { cb = force; }
    this.ended = true;
    this.connected = false;
    setImmediate(() => { this.emit("close"); if (cb) cb(); });
  }
  // test helpers
  simulateConnect() { this.connected = true; this.emit("connect"); }
  simulateClose() { this.connected = false; this.emit("close"); }
}
FakeMqttClient.instances = [];

function chainProxy() {
  const fn = function () { return proxy; };
  const proxy = new Proxy(fn, { get: (t, k) => (k === Symbol.toPrimitive ? () => "" : k === "then" ? undefined : proxy), apply: () => proxy });
  return proxy;
}

class FakeCookieJar {
  constructor() { this.store = {}; }
  setCookieSync(c) { const [kv] = String(c).split(";"); const i = kv.indexOf("="); this.store[kv.slice(0, i).trim()] = kv.slice(i + 1); }
  getCookieStringSync() { return Object.entries(this.store).map(([k, v]) => k + "=" + v).join("; "); }
  getCookiesSync() { return Object.entries(this.store).map(([key, value]) => ({ key, value, domain: "facebook.com", path: "/" })); }
  async setCookie(c, u) { return this.setCookieSync(c, u); }
  async getCookieString() { return this.getCookieStringSync(); }
  async getCookies() { return this.getCookiesSync(); }
  toJSON() { return { cookies: this.getCookiesSync() }; }
}

class FakeModel { static init() { return this; } static associate() {} static hasMany() {} static belongsTo() {} }
class FakeSequelize {
  constructor() { this.models = {}; }
  async sync() {} async authenticate() {} async close() {}
  define() { return class extends FakeModel {}; }
}
FakeSequelize.Transaction = { ISOLATION_LEVELS: { READ_COMMITTED: "READ COMMITTED" } };

function axiosStub() {
  const f = async () => { throw new Error("axios stub: network is not available in tests"); };
  f.create = () => f; f.get = f; f.post = f; f.request = f;
  f.defaults = { headers: { common: {} } }; f.interceptors = { request: { use() {} }, response: { use() {} } };
  return f;
}

const MOCKS = {
  mqtt: () => ({ Client: FakeMqttClient, connect: () => new FakeMqttClient() }),
  ws: () => class FakeWebSocket extends EventEmitter {},
  "https-proxy-agent": () => class FakeProxyAgent { constructor(u) { this.url = u; } },
  axios: axiosStub,
  "axios-cookiejar-support": () => ({ wrapper: (x) => x }),
  "tough-cookie": () => ({ CookieJar: FakeCookieJar, Cookie: class {} }),
  "form-data": () => class FakeFormData { append() {} getHeaders() { return {}; } },
  bluebird: () => { const P = function (fn) { return new Promise(fn); }; P.promisify = util.promisify; P.all = Promise.all.bind(Promise); P.resolve = Promise.resolve.bind(Promise); P.reject = Promise.reject.bind(Promise); return P; },
  chalk: () => chainProxy(),
  "gradient-string": () => new Proxy(() => (x) => x, { get: (_, k) => (k === "then" ? undefined : (x) => x) }),
  duplexify: () => stream.Duplex,
  sequelize: () => ({ Sequelize: FakeSequelize, Model: FakeModel, DataTypes: new Proxy({}, { get: (_, k) => String(k) }) }),
  request: () => { const r = () => {}; r.defaults = () => r; r.jar = () => new FakeCookieJar(); return r; }
};

function install() {
  if (process.env.TORU_REAL_DEPS === "1") return;
  const origLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(MOCKS, request)) {
      used.add(request);
      MOCKS[request].cache = MOCKS[request].cache || MOCKS[request]();
      return MOCKS[request].cache;
    }
    return origLoad.apply(this, arguments);
  };
}

/** Remove all loaded package modules from require.cache so each test gets fresh state. */
function purge(rootDir) {
  for (const k of Object.keys(require.cache)) if (k.startsWith(rootDir)) delete require.cache[k];
}

module.exports = { install, purge, FakeMqttClient, FakeCookieJar, used, MOCKS };
