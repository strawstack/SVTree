class H {
    constructor() {}
}
H.makeRand = (v) => new Math.seedrandom(v);
H.deg = rad => rad / Math.PI * 180;
H.rad = deg => deg / 180 * Math.PI;
