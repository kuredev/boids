import _ = require("lodash");
import anime = require("animejs");

// The distance want to be away from the wall
const CLOSE_WALL_DISTANCE = 20;
// The distance want to be away from other boids
const CLOSE_BOID_DISTANCE = 80;
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
    this.drads = []; // Stores the direction of each force to calculate the moving direction
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

  public dump() {
    console.log("id: " + this.id);
    console.log("coordinate: " + this.coordinate);
    console.log("rad: " + this.rad);
    console.log("distance: " + this.distance);
  }
}

class Flock {
  constructor(private boids?: Array<Boid>) {
    this.boids = boids;
  }

  public static createBoids(_num?: number): Array<Boid> {
    let num = _num === undefined ? 1 : _num;
    let boids = [];

    for (let i = 0; i < num; i++) {
      let x = Math.random() * 500;
      let y = Math.random() * -300;
      let rad = Math.random() * 2 * Math.PI;

      boids.push(new Boid(i, { x: x, y: y }, rad, 1));
    }
    return boids;
  }

  public calcDRads(boid: Boid) {
    this.radToDrads(boid);

    this.turnFlockCenter(boid);
    this.matchVelocity(boid);
    this.avoidOtherBoids(boid);
    this.avoidWall(boid);
  }

  // Update the Boid coordinates using the accumulated drads
  public updateCoordinateAndRad(boid: Boid) {
    let aveRad = this.calcAverageRads(boid.drads);
    let aveDradsUpteaed = this.calcAverageRad(aveRad, boid.rad);
    let updatedCoordinate = this.addCordinateToRad(
      boid.coordinate,
      aveDradsUpteaed
    );

    boid.drads = [];
    boid.rad = aveDradsUpteaed;
    boid.coordinate = updatedCoordinate;
  }

  private addCordinateToRad(c: Coordinate, rad: number): Coordinate {
    return {
      x: c.x + Math.cos(rad) * MOVE_FACTOR,
      y: c.y + Math.sin(rad) * MOVE_FACTOR,
    };
  }

  private avoidWall(boid: Boid): Boid {
    if (
      (this.closeRight(boid) && this.faceRight(boid)) ||
      (boid.coordinate.x > WALLX && this.faceRight(boid))
    ) {
      this.inversionX(boid);
    } else if (
      (this.closeLeft(boid) && this.faceLeft(boid)) ||
      (boid.coordinate.x < 0 && this.faceLeft(boid))
    ) {
      this.inversionX(boid);
    } else if (
      (this.closeTop(boid) && this.faceTop(boid)) ||
      (boid.coordinate.y > 0 && this.faceTop(boid))
    ) {
      this.inversionY(boid);
    } else if (
      (this.closeButtom(boid) && this.faceDown(boid)) ||
      (boid.y() * -1 > WALLY && this.faceDown(boid))
    ) {
      this.inversionY(boid);
    }

    return boid;
  }

  private avoidOtherBoids(boid: Boid) {
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

  private calcAverageCoordinate(boids: Array<Boid>): Coordinate {
    var sumX = 0;
    var sumY = 0;
    for (let boid of boids) {
      sumX += boid.x();
      sumY += boid.y();
    }
    return { x: sumX / boids.length, y: sumY / boids.length };
  }

  private calcAverageRad(r1: number, r2: number): number {
    let dx1 = Math.cos(r1);
    let dx2 = Math.cos(r2);

    let dy1 = Math.sin(r1);
    let dy2 = Math.sin(r2);

    let dx = (dx1 + dx2) / 2;
    let dy = (dy1 + dy2) / 2;

    return Math.atan2(dy, dx);
  }

  private calcAverageRadianBoids(boids: Array<Boid>): number {
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

  private calcAverageRads(rads: Array<number>): number {
    let sumX: number = 0;
    let sumY: number = 0;

    for (let rad of rads) {
      sumX += Math.cos(rad);
      sumY += Math.sin(rad);
    }

    return this.vectorToRadian({ x: sumX, y: sumY });
  }


  // Whether the distance between the coordinates of c1 and c2 is closer than standardDinstance
  private closeDistanceCoordinate(
    c1: Coordinate,
    c2: Coordinate,
    standardDistance: number
  ): boolean {
    let distance: number = Math.sqrt(
      Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2)
    );
    return distance < standardDistance ? true : false;
  }

  private closeButtom(boid: Boid): boolean {
    let distanceY = Math.abs(WALLY + boid.y());

    return distanceY < CLOSE_WALL_DISTANCE ? true : false;
  }

  private closeLeft(boid: Boid): boolean {
    let distanceX = Math.abs(boid.x());

    return distanceX < CLOSE_WALL_DISTANCE ? true : false;
  }

  // Is it close to the top wall?
  private closeTop(boid: Boid): boolean {
    let distanceY = Math.abs(boid.y() * -1);

    return distanceY < CLOSE_WALL_DISTANCE ? true : false;
  }

  private closeRight(boid: Boid): boolean {
    let distanceX = Math.abs(WALLX - boid.x());

    return distanceX < CLOSE_WALL_DISTANCE ? true : false;
  }

  private coordinatesToVector(c1: Coordinate, c2: Coordinate): Vector {
    return { x: c2.x - c1.x, y: c2.y - c1.y };
  }

   // Creates and returns a new Boids that excludes the argument Boid from the instance variable Boids.
  // (No change is made to the instance variable Boids)
  private extractBoidFromBoids(boid: Boid): Array<Boid> {
    let except_boids = this.boids.filter(function (boid_) {
      return boid != boid_;
    });
    return except_boids;
  }

  private faceDown(boid: Boid): boolean {
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

  private faceLeft(boid: Boid): boolean {
    let rad = this.calcAverageRads(boid.drads);

    return (rad < 4.71239 && rad > 1.5708) || (rad < -1.5708 && rad > -4.71239)
      ? true
      : false;
  }

  private faceRight(boid: Boid): boolean {
    let rad = this.calcAverageRads(boid.drads);

    return (rad > -1.5708 && rad < 1.5708) || rad > 4.71239 ? true : false;
  }

  private faceTop(boid: Boid): boolean {
    let rad = this.calcAverageRads(boid.drads);

    return rad < 3.14159 && rad > 0 ? true : false;
  }

  private inversionX(boid: Boid): Boid {
    let aveRad = this.calcAverageRads(boid.drads);
    let dx = Math.cos(aveRad);
    let dxNew = dx * -1;
    let newRad = this.vectorToRadian({ x: dxNew, y: Math.sin(aveRad) });
    boid.drads = [newRad];

    return boid;
  }

  private inversionY(boid: Boid): Boid {
    let aveRad = this.calcAverageRads(boid.drads);
    let dy = Math.sin(aveRad);
    let dyNew = dy * -1;
    let newRad = this.vectorToRadian({ x: Math.cos(aveRad), y: dyNew });

    boid.drads = [newRad];

    return boid;
  }

  // ex: { 1, 1} -> { -1, -1}
  private inversionVector(vector: Vector): Vector {
    let resultVector: Vector = { x: vector.x * -1, y: vector.y * -1 };
    return resultVector;
  }

  private matchVelocity(boid: Boid) {
    let boids = this.extractBoidFromBoids(boid);
    if (boids.length == 0) return;

    let aveRad = this.calcAverageRadianBoids(boids);
    boid.drads.push(aveRad);
  }

  private turnFlockCenter(boid: Boid) {
    let boids = this.extractBoidFromBoids(boid);
    if (boids.length == 0) return;

    let averageCoordinate = this.calcAverageCoordinate(boids);

    let vector = this.coordinatesToVector(boid.coordinate, averageCoordinate);

    let drad = this.vectorToRadian(vector);

    boid.drads.push(drad);
  }


  private radToDrads(boid: Boid): Boid {
    boid.drads.push(boid.rad);
    return boid;
  }

  private vectorToRadian(vector: Vector): number {
    return Math.atan2(vector.y, vector.x);
  }
}

// for debug method
function dumpBoid(boid: Boid) {
  console.log(boid.id);
  console.log("x: " + boid.coordinate.x);
  console.log("y: " + boid.coordinate.y);
  console.log("rad: " + boid.rad);
  console.log("drads: " + boid.drads);
  console.log("degree: " + boid.rad * (180 / Math.PI));
}

// for debug method
function dumpBoids(boids: Array<Boid>) {
  for (let boid of boids) {
    boid.dump();
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

function degreeToRad(degree: number){
  return degree * ( Math.PI / 180 );
}

//let boids: Array<Boid> = Flock.createBoids(30);

let boid1 = new Boid(0, {x: 10, y: -50 }, degreeToRad(0), 1);
let boid2 = new Boid(1, {x: 300, y: -200 }, degreeToRad(45), 1);
let boid3 = new Boid(2, {x: 10, y: -100 }, degreeToRad(0), 1);
let boid4 = new Boid(3, {x: 200, y: -200 }, degreeToRad(45), 1);

let boids: Array<Boid> = [boid1, boid2, boid3, boid4];
let flock = new Flock(boids);
viewBoids(boids);

// Move Boid by clicking
let btn = document.getElementById("move");
if (btn !== null){
  btn.addEventListener("click", function () {
    for (let boid of boids) {
      flock.calcDRads(boid);
      flock.updateCoordinateAndRad(boid);

      let div = document.getElementById("boid" + boid.id);
      if (div !== null) {
        div.style.transform = "rotate(" + (90 - boid.deg()) + "deg)";

        anime({
          targets: "#boid" + boid.id,
          left: boid.coordinate.x + "px",
          top: -1 * boid.coordinate.y + "px",
          easing: "linear",
        });
      }
    }
  });
}

// Boid moves automatically
let auto_btn = document.getElementById("auto_move");
function move_loop() {
  for (let boid of boids) {
    flock.calcDRads(boid);
    flock.updateCoordinateAndRad(boid);

    let div = document.getElementById("boid" + boid.id);
    if (div !== null) {
      div.style.transform = "rotate(" + (90 - boid.deg()) + "deg)";

      anime({
        targets: "#boid" + boid.id,
        left: boid.coordinate.x + "px",
        top: -1 * boid.coordinate.y + "px",
        easing: "linear",
      });
    }
  }
}

if (auto_btn !== null){
  auto_btn.addEventListener("click", function () {
    setInterval(move_loop, 50);
  });
}

// Boid moves automatically Async
let auto_btn_async = document.getElementById("auto_move_async");
function move_loop_async() {
  for (let boid of boids) {
    flock.calcDRads(boid);
  }

  for (let boid of boids) {
    flock.updateCoordinateAndRad(boid);

    let div = document.getElementById("boid" + boid.id);
    if (div !== null) {
      div.style.transform = "rotate(" + (90 - boid.deg()) + "deg)";

      anime({
        targets: "#boid" + boid.id,
        left: boid.coordinate.x + "px",
        top: -1 * boid.coordinate.y + "px",
        easing: "linear",
      });
    }
  }
}

if (auto_btn_async !== null){
  auto_btn_async.addEventListener("click", function () {
    setInterval(move_loop_async, 50);
  });
}
