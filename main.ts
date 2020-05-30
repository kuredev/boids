import _ = require("lodash");
import anime = require("animejs");

// 最低限壁と離れていてほしい距離
const CLOSE_WALL_DISTANCE = 20;
// 他のBoidと離れていてほしい距離
const CLOSE_BOID_DISTANCE = 80;
// Boidを移動させるときの係数（数が大きいほど一度に大きく移動する）
const MOVE_FACTOR = 10;
let WALLX = 500;
let WALLY = 280;

type Coordinate = {
  x: number;
  y: number;
};

type Vector = {
  x: number;
  y: number;
};

// Boid
class Boid {
  public drads: Array<number>;
  constructor(
    public id: number,
    public coordinate: Coordinate,
    public rad: number,
    public distance?: number // Speed
  ) {
    this.id = id;
    this.coordinate = coordinate;
    this.rad = rad;
    this.distance = distance === undefined ? 1 : distance;
    this.drads = []; // // 計算途中のdrad 置き場。最後に平均値をdradに入れて中身を消す
  }

  public x() {
    return this.coordinate.x;
  }

  public y() {
    return this.coordinate.y;
  }

  public dx() {
    return this.distance * Math.cos(this.rad);
  }

  public dy() {
    return this.distance * Math.sin(this.rad);
  }

  public deg() {
    return (this.rad * 180) / Math.PI;
  }
}

// 群れ
class Flock {
  constructor(private boids?: Array<Boid>) {
    this.boids = boids;
  }

  // いくつかBoidを生成して返します
  public static createBoids(_num?: number): Array<Boid> {
    let num = _num === undefined ? 1 : _num;
    let boids = [];

    for (let i = 0; i < num; i++) {
      let x = Math.random() * 500;
      let y = Math.random() * -300;
      let rad = Math.random() * 2 * Math.PI;

      boids.push(new Boid(i, { x: x, y: y }, rad, 0));
    }
    return boids;
  }

  public calcDRads(boid: Boid) {
    this.radToDrads(boid); // 既存のRadianを更新用の箱に入れる
    this.turnFlockCenter(boid); // 群れの中央に向く
    this.matchVelocity(boid); // 群れと向きをあわせる
    this.avoidOtherBoids(boid); // 近い群れと離れる
    this.avoidWall(boid); // 壁が来たら跳ね返る。
  }

  public radToDrads(boid: Boid): Boid {
    boid.drads.push(boid.rad);
    return boid;
  }

  // 壁を避ける
  public avoidWall(boid: Boid): Boid {
    // X方向の壁とぶつかる（一定距離より近い）、かつ、そのX方向と逆にすすめる
    // とりあえず単純にいまの座標で考える。サンプルコードがそうなっているので。
    // それまでのRad計算は全部無視する
    if (
      (this.closeXRight(boid) && this.faceX(boid)) ||
      (boid.coordinate.x > WALLX && this.faceX(boid))
    ) {
      this.inversionX(boid);
    } else if (
      (this.closeXLeft(boid) && this.faceX0(boid)) ||
      (boid.coordinate.x < 0 && this.faceX0(boid))
    ) {
      this.inversionX(boid);
    } else if (
      (this.closeYTop(boid) && this.faceYTop(boid)) ||
      (boid.coordinate.y > 0 && this.faceYTop(boid))
    ) {
      this.inversionY(boid);
    } else if (
      (this.closeYButtom(boid) && this.faceYButtom(boid)) ||
      (boid.y() * -1 > WALLY && this.faceYButtom(boid))
    ) {
      this.inversionY(boid);
    }

    return boid;
  }

  // 上の壁と近いか
  public closeYTop(boid: Boid): boolean {
    let distanceY = Math.abs(boid.y() * -1);

    if (distanceY < CLOSE_WALL_DISTANCE) {
      return true;
    } else {
      return false;
    }
  }

  // 下の壁と近いか
  public closeYButtom(boid: Boid): boolean {
    let distanceY = Math.abs(WALLY + boid.y());

    if (distanceY < CLOSE_WALL_DISTANCE) {
      return true;
    } else {
      return false;
    }
  }

  // 左の壁と近いか
  public closeXLeft(boid: Boid): boolean {
    let distanceX = Math.abs(boid.x());

    if (distanceX < CLOSE_WALL_DISTANCE) {
      return true;
    } else {
      return false;
    }
  }

  // 右の壁に近いか
  public closeXRight(boid: Boid): boolean {
    let distanceX = Math.abs(WALLX - boid.x());

    if (distanceX < CLOSE_WALL_DISTANCE) {
      return true;
    } else {
      return false;
    }
  }

  public faceYTop(boid: Boid): boolean {
    let rad = this.calcAverageRads(boid.drads);
    if (rad < 3.14159 && rad > 0) {
      return true;
    } else {
      return false;
    }
  }

  public faceYButtom(boid: Boid): boolean {
    let rad = this.calcAverageRads(boid.drads);
    if (
      (rad < 6.28319 && rad > 3.14159) ||
      (rad > -3.14159 && rad < -0.0174533)
    ) {
      return true;
    } else {
      return false;
    }
  }

  // drads の平均が左を向いているかどうか
  public faceX0(boid: Boid): boolean {
    let rad = this.calcAverageRads(boid.drads);
    if ((rad < 4.71239 && rad > 1.5708) || (rad < -1.5708 && rad > -4.71239)) {
      return true;
    } else {
      return false;
    }
  }

  // 済
  // drads の平均が右を向いているかどうか
  public faceX(boid: Boid): boolean {
    let rad = this.calcAverageRads(boid.drads);
    if ((rad > -1.5708 && rad < 1.5708) || rad > 4.71239) {
      return true;
    } else {
      return false;
    }
  }

  // 済
  public inversionX(boid: Boid): Boid {
    let aveRad = this.calcAverageRads(boid.drads);
    let dx = Math.cos(aveRad);
    let dxNew = dx * -1;
    let newRad = this.vectorToRadian({ x: dxNew, y: Math.sin(aveRad) });
    boid.drads = [newRad];

    return boid;
  }

  public inversionY(boid: Boid): Boid {
    let aveRad = this.calcAverageRads(boid.drads);
    let dy = Math.sin(aveRad);
    let dyNew = dy * -1;
    let newRad = this.vectorToRadian({ x: Math.cos(aveRad), y: dyNew });

    boid.drads = [newRad];

    return boid;
  }

  // 溜まった drads をベースに rad に移動するべき向きを代入する
  // 代入時にcoordinate に Y座標は反転させる
  public updateCoordinateAndRad(boid: Boid) {
    let aveRad = this.calcAverageRads(boid.drads);
    let aveDradsUpteaed = this.calcAverageRad(aveRad, boid.rad); // ★
    let updatedCoordinate = this.addCordinateToRad(
      boid.coordinate,
      aveDradsUpteaed
    );
    boid.drads = [];
    boid.rad = aveDradsUpteaed; // 次の傾き

    boid.coordinate = updatedCoordinate;
  }

  // 座標を引数の角度（ラジアン）にしたがって移動させる
  public addCordinateToRad(c: Coordinate, rad: number): Coordinate {
    return {
      x: c.x + Math.cos(rad) * MOVE_FACTOR,
      y: c.y + Math.sin(rad) * MOVE_FACTOR,
    };
  }

  // Boidが避けるべきBoidが見つかったら反対方向に向く
  public avoidOtherBoids(boid: Boid) {
    let boids = this.extractBoidFromBoids(boid);
    let rads: Array<number> = [];
    for (let otherBoid of boids) {
      let closeDistance: boolean = this.closeDistanceCoordinate(
        boid.coordinate,
        otherBoid.coordinate,
        CLOSE_BOID_DISTANCE
      );
      if (closeDistance) {
        let vector: Vector = this.coordinatesToVector(
          boid.coordinate,
          otherBoid.coordinate
        );
        let _vector = this.inversionVector(vector);
        rads.push(this.vectorToRadian(_vector));
      }
    }

    let aveRad: number = this.calcAverageRads(rads);
    boid.drads.push(aveRad);
  }

  // ベクトルを反転させる
  // 例 { 1, 1} -> { -1, -1}
  public inversionVector(vector: Vector): Vector {
    let resultVector: Vector = { x: vector.x * -1, y: vector.y * -1 };
    return resultVector;
  }

  // c1 と c2 の座標の距離が standardDinstance より近いか
  public closeDistanceCoordinate(
    c1: Coordinate,
    c2: Coordinate,
    standardDistance: number
  ): boolean {
    let distance: number = Math.sqrt(
      Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2)
    );
    return distance < standardDistance ? true : false;
  }

  // 引数のBoidの向き先を他のBoidの平均と合わせる
  public matchVelocity(boid: Boid) {
    let boids = this.extractBoidFromBoids(boid);
    if (boids.length == 0) {
      return;
    }

    let aveRad = this.calcAverageRadianBoids(boids);
    boid.drads.push(aveRad);
  }

  // 引数のラジアンの平均のラジアンを返す
  public calcAverageRad(r1: number, r2: number): number {
    let dx1 = Math.cos(r1);
    let dx2 = Math.cos(r2);

    let dy1 = Math.sin(r1);
    let dy2 = Math.sin(r2);

    let dx = (dx1 + dx2) / 2;
    let dy = (dy1 + dy2) / 2;

    return Math.atan2(dy, dx);
  }

  // 引数のラジアンの平均のラジアンを返す
  public calcAverageRads(rads: Array<number>): number {
    let sumX: number = 0;
    let sumY: number = 0;

    for (let rad of rads) {
      sumX += Math.cos(rad);
      sumY += Math.sin(rad);
    }

    return this.vectorToRadian({ x: sumX, y: sumY });
  }

  // 引数Boidの向き先をその他Boidの中央に向ける
  public turnFlockCenter(boid: Boid) {
    let boids = this.extractBoidFromBoids(boid);
    if (boids.length == 0) {
      return;
    }

    // 中央の座標を求める
    let averageCoordinate = this.calcAverageCoordinate(boids);

    // 今の座標から中央の座標へのベクトルを求める
    let vector = this.coordinatesToVector(boid.coordinate, averageCoordinate);

    //求めたベクトルをラジアンに変換してdradに入れる
    let drad = this.vectorToRadian(vector);

    boid.drads.push(drad);
  }

  // インスタンス変数のBoidsから引数Boidを排除したBoidsを新たに生成して返します
  // （インスタンス変数のBoidsには変更は加わりません）
  public extractBoidFromBoids(boid: Boid): Array<Boid> {
    let except_boids = this.boids.filter(function (boid_) {
      return boid != boid_;
    });
    return except_boids;
  }

  // ベクトルからラジアンに変換
  public vectorToRadian(vector: Vector): number {
    return Math.atan2(vector.y, vector.x);
  }

  // 2座標間(c1 -> c2)のベクトルを求める
  public coordinatesToVector(c1: Coordinate, c2: Coordinate): Vector {
    return { x: c2.x - c1.x, y: c2.y - c1.y };
  }

  // 引数のBoidsたちの座標の平均を求める
  public calcAverageCoordinate(boids: Array<Boid>): Coordinate {
    var sumX = 0;
    var sumY = 0;
    for (let boid of boids) {
      sumX += boid.x();
      sumY += boid.y();
    }
    return { x: sumX / boids.length, y: sumY / boids.length };
  }

  // 引数のBoidsたちの持っているRadの平均を求める
  public calcAverageRadianBoids(boids: Array<Boid>): number {
    let sumDx = 0;
    let sumDy = 0;
    for (let boid of boids) {
      let dx = Math.cos(boid.rad);
      let dy = Math.sin(boid.rad);

      sumDx += dx;
      sumDy += dy;
    }
    let aveDx = sumDx / boids.length;
    let aveDy = sumDy / boids.length;

    let averad = Math.atan2(aveDy, aveDx);
    return averad;
  }
}

function dumpBoid(boid: Boid) {
  console.log(boid.id);
  console.log("x: " + boid.coordinate.x);
  console.log("y: " + boid.coordinate.y);
  console.log("rad: " + boid.rad);
  console.log("drads: " + boid.drads);
  console.log("degree: " + boid.rad * (180 / Math.PI));
}

function dumpBoids(boids: Array<Boid>) {
  for (let boid of boids) {
    console.log(boid.id);
    console.log("x: " + boid.coordinate.x);
    console.log("y: " + boid.coordinate.y);
    console.log("rad: " + boid.rad);
    console.log("deg: " + boid.deg());
    console.log("drads: " + boid.drads);
  }
}

function viewBoids(boids: Array<Boid>) {
  let border = document.querySelector("#border");
  boids.forEach(function (boid, i) {
    var div = document.createElement("div");
    div.className = "square";
    div.id = "boid" + boid.id;
    div.style.top = -1 * boid.coordinate.y + "px";
    div.style.left = boid.coordinate.x + "px";
    div.style.position = "absolute";
    div.style.transform = "rotate(" + (90 - boid.deg()) + "deg)";
    border.appendChild(div);
  });
}

let boids: Array<Boid> = Flock.createBoids(30);
let flock = new Flock(boids);
viewBoids(boids);

// 動く
let btn = document.getElementById("move");
btn.addEventListener("click", function () {
  for (let boid of boids) {
    flock.calcDRads(boid); // drads に色々入れる
    flock.updateCoordinateAndRad(boid);

    if (boid.id == 1) {
      console.log("===after update");
      dumpBoid(boid);
    }

    // 画面上の向きを変える
    let div = document.getElementById("boid" + boid.id);
    let deg = (boid.rad * 180) / Math.PI; // rad はイメージどおりのrad
    div.style.transform = "rotate(" + (90 - deg) + "deg)";

    // 移動
    anime({
      targets: "#boid" + boid.id,
      left: boid.coordinate.x + "px",
      top: boid.coordinate.y + "px",
      easing: "linear",
    });
  }
});

let auto_btn = document.getElementById("auto_move");
function move_loop() {
  for (let boid of boids) {
    flock.calcDRads(boid); // drads に色々入れる
    flock.updateCoordinateAndRad(boid);

    // 画面上の向きを変える
    let div = document.getElementById("boid" + boid.id);
    div.style.transform = "rotate(" + (90 - boid.deg()) + "deg)";

    anime({
      targets: "#boid" + boid.id,
      left: boid.coordinate.x + "px",
      top: -1 * boid.coordinate.y + "px",
      easing: "linear",
    });
  }
}

auto_btn.addEventListener("click", function () {
  setInterval(move_loop, 50);
});
