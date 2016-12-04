THREE.PointerLockControls = function (camera) {

	var scope = this;

	camera.rotation.set(0, 0, 0);

	var pitchObject = new THREE.Object3D();
	pitchObject.add(camera);

	var yawObject = new THREE.Object3D();
	yawObject.add(pitchObject);

	var PI_2 = Math.PI / 2;

	var onMouseMove = function (event) {
		if ( scope.enabled === false ) return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		yawObject.rotation.y -= movementX * 0.002;
		pitchObject.rotation.x -= movementY * 0.002;

		pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
	};

	this.dispose = function() {
		document.removeEventListener('mousemove', onMouseMove);
	};

	document.addEventListener('mousemove', onMouseMove);

	this.enabled = false;

	this.getObject = function () {
		return yawObject;
	};

	this.getDirection = function() {
		var direction = new THREE.Vector3(0, 0, -1);
		var rotation = new THREE.Euler(0, 0, 0, "YXZ");

		return function(v) {
			rotation.set(pitchObject.rotation.x, yawObject.rotation.y, 0);
			v.copy(direction).applyEuler(rotation);

			return v;
		};
	}();

};


var ticks = 0,
	fps = 60;

var ctx,
	audio,
	audioSrc,
	analyser,
	frequencyData,
	N = 2048,
	timeConst = 0.85,
	maxFreq = N/2;

var velocity = -0,
	rotVelocity = 0;

var rotVelX = 0,
	rotVelY = 0,
	rotAccX = 0,
	rotAccY = 0;
	
var camLock = false,
	showAxes = false;


var nCubesX = 16, 
	nCubesY = 16,
	nCubesZ = 16;
	
var maxX = nCubesX/2,
	maxY = nCubesY/2,
	maxZ = nCubesZ/2;

var cubeWidthX = 1/(2*nCubesX),
    cubeWidthY = 1/(2*nCubesY),
    cubeWidthZ = 1/(2*nCubesZ);
	
var cubes = [],
	cubes_orig = [];


var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = "fixed";
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0, 0, 0);

var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.001, 1000);
var controls = new THREE.PointerLockControls(camera);
controls.getObject().translateZ(2);

scene.add(controls.getObject());


var light1 = new THREE.PointLight(0xffffff, 1, 100);
light1.position.set(2, 2, -2);
scene.add(light1);

scene.add(new THREE.AmbientLight(0xaaaaaa));


var cubeGeometry = new THREE.BoxGeometry(cubeWidthX, cubeWidthY, cubeWidthZ);

for ( var i=0 ; i<nCubesX ; i++ ) {
	for ( var j=0 ; j<nCubesY ; j++ ) {
		for ( var k=0 ; k<nCubesZ ; k++ ) {
			var h = i/nCubesX,
				s = j/nCubesY,
				l = k/nCubesZ;
			
			var material = new THREE.MeshPhongMaterial({
				color: new THREE.Color("hsl("+360*h+",100%,50%)")
			});
			var cube = new THREE.Mesh(cubeGeometry, material);
			
			cube.position.x = maxX*((i+0.5)/nCubesX-0.5);
			cube.position.y = maxY*((j+0.5)/nCubesY-0.5);
			cube.position.z = maxZ*((k+0.5)/nCubesZ-0.5);
			
			//cube.rotation.x = Math.PI/6;
			//cube.rotation.y = Math.PI/6;

			if ( !cubes[i] ) {
				cubes.push([]);
				cubes_orig.push([]);
			}
			if ( !cubes[i][j] ) {
				cubes[i].push([]);
				cubes_orig[i].push([]);
			}
			
			cubes[i][j].push(cube);
			cubes_orig[i][j].push({
				x: cube.position.x,
				y: cube.position.y,
				z: cube.position.z,
				h: h,
				s: s,
				l: l
			});
			
			scene.add(cubes[i][j][k]);
		}
	}
}

var geometry = new THREE.Geometry();
geometry.vertices.push(
	new THREE.Vector3(0,  0, 0),
	new THREE.Vector3(10, 0, 0)
);
var lineX = new THREE.Line(geometry, new THREE.LineBasicMaterial({
	color: 0xff0000
}));

geometry = new THREE.Geometry();
geometry.vertices.push(
	new THREE.Vector3(0,  0, 0),
	new THREE.Vector3(0, 10, 0)
);
var lineY = new THREE.Line(geometry, new THREE.LineBasicMaterial({
	color: 0x00ff00
}));

geometry = new THREE.Geometry();
geometry.vertices.push(
	new THREE.Vector3(0,  0,  0),
	new THREE.Vector3(0,  0, 10)
);
var lineZ = new THREE.Line(geometry, new THREE.LineBasicMaterial({
	color: 0x0000ff
}));

document.getElementById("audioFile").addEventListener("change", function (){
	var file = document.getElementById("audioFile").files[0];
	
	audio = document.getElementById("audioIn");
	audio.src = URL.createObjectURL(file);
	
	ctx = new AudioContext();
	analyser = ctx.createAnalyser();
	
	audioSrc = ctx.createMediaElementSource(audio);
	audioSrc.connect(analyser);
	analyser.connect(ctx.destination);
	
    analyser.fftSize = N;
	analyser.smoothingTimeConstant = timeConst;
	
	frequencyData = new Float32Array(analyser.frequencyBinCount);
	
	audio.play();
});


document.getElementsByTagName("canvas")[0].addEventListener("click", function (){
	if ( !camLock )
	{
		document.getElementsByTagName("canvas")[0].requestPointerLock();
		document.addEventListener("pointerlockchange", function (){
			if ( document.pointerLockElement != document.getElementsByTagName("canvas")[0] )
				camLock = false;
		});
		camLock = true;
	}
});

document.addEventListener("keydown", function (e) {
	switch (e.key)
	{
		case "w":
			velocity -= 0.1;
			break;
		case "s":
			velocity += 0.1;
			break;
		case "q":
			controls.getObject().rotateZ(1/fps);
		break;
		case "e":
			controls.getObject().rotateZ(-1/fps);
		break;
		case "a":
			rotVelocity += 0.01;
			break;
		case "d":
			rotVelocity -= 0.01;
			break;
		case "k":
			if ( !showAxes )
			{
				scene.add(lineX);
				scene.add(lineY);
				scene.add(lineZ);
			} else {
				scene.remove(lineX);
				scene.remove(lineY);
				scene.remove(lineZ);
			}
			showAxes = !showAxes;
			break;
	}
});

document.addEventListener("mousemove", function (e) {
	if ( camLock )
		mouseMove(e.movementX, e.movementY);
});

document.addEventListener("wheel", function (e) {
	velocity += (e.deltaY>0 ? 0.1 : -0.1);
});

function mouseMove(dx, dy)
{
		rotAccX = dx/1000;
		rotAccY = dy/1000;
}

window.addEventListener('resize', function (){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

var render = function () {
	requestAnimationFrame(render);

	ticks++;
	
	controls.getObject().position.z += velocity/fps;
	//controls.getObject().translateZ(velocity/fps);
	
	rotVelX += rotAccX;
	rotVelY += rotAccY;
	
	rotAccX /= 2;
	rotAccY /= 2;
	
	rotVelX = Math.abs(rotVelX) < 0.0005 ? 0 : rotVelX/1.1
	rotVelY = Math.abs(rotVelY) < 0.0005 ? 0 : rotVelY/1.1
	
	controls.getObject().rotateX(-rotVelY);
	controls.getObject().rotateY(-rotVelX);
	controls.getObject().rotateZ(rotVelocity/fps);
	
	light1.position.z = controls.getObject().position.z - 1;
	
	var rRate = 2 * fps,
		bgRate = 1 / 10,
		dispFactorX = 4,
		dispFactorY = 2;
		
		
	scene.background.setHSL(bgRate*ticks/fps, 1, 0);
	
	if ( analyser ) {
		analyser.getFloatFrequencyData(frequencyData);

		var fData = new Float32Array(frequencyData.length);
		var avgPow1 = 0,
			avgPow2 = 0,
			minPow1 = 1000,
			maxPow1 = -1000,
			minPow2 = 1000,
			maxPow2 = -1000;

		for ( var i=0 ; i<frequencyData.length ; i++ ) {
			minPow1 = Math.min(minPow1, frequencyData[i]);
			maxPow1 = Math.max(maxPow1, frequencyData[i]);
			avgPow1 += frequencyData[i] / frequencyData.length;
		}
		
		for ( var i=0 ; i<frequencyData.length ; i++ ) {
			fData[i] = (frequencyData[i]-minPow1)/(maxPow1-minPow1);
			avgPow2 += fData[i] / fData.length;
			minPow2 = Math.min(minPow2, fData[i]);
			maxPow2 = Math.max(maxPow2, fData[i]);
		}
	
		//console.log(avgPow1 + ": " + maxPow1 + ", " + minPow1);
		//console.log(avgPow2 + ": " + maxPow2 + ", " + minPow2);
	
		var avgPowers = [],
			avgAvgPowers = 0;
		for ( var i=0 ; i<nCubesX/2 ; i++ ) {
			var avgPow3 = 0,
				binLen = (fData.length/(nCubesX/2))
				llim = i * binLen;
				
			for ( var j=0 ; j<binLen ; j++ ) {
				avgPow3 += fData[llim+j]/binLen;
			}
			avgPowers.push(avgPow3);
			avgAvgPowers += avgPow3/(nCubesX/2);
		}
	
		for ( var i=0 ; i<nCubesX ; i++ ) {
			var x_ = i/nCubesX,
				_x = i/nCubesX - 0.5,
				idx = 0, //maxFreq*x_,
				disp = 0,
				dispFactor = 2;
			
			if ( i < nCubesX/2 )
				idx = nCubesX/2 - i - 1;
			else
				idx = i - nCubesX/2;
			
			disp = dispFactor * avgPowers[idx] * avgAvgPowers * 1/((idx/nCubesX)+1);
			disp = isNaN(disp) ? 0 : disp;
			//disp = avgPow2;
			//disp *= dispFactor;
			
			//console.log(idx);
			//console.log(frequencyData[idx]);
			
			for ( var j=0 ; j<nCubesY ; j++ ) {
				var y_ = j/nCubesY,
					_y = j/nCubesY - 0.5;
				
				for ( var k=0 ; k<nCubesZ ; k++ ) {
							var cube = cubes[i][j][k];
							var cube_orig = cubes_orig[i][j][k];
							
							var x = cube.position.x,
								y = cube.position.y,
								z = cube.position.z;
							
							var z_ = k/nCubesZ,
								_z = k/nCubesZ - 0.5;
								
							
							cube.position.y = cube_orig.y + disp;
							
							//cube.position.x += dispFactorX * Math.sin(ticks/fps + 2*Math.PI*y/maxY)/1000;
							//cube.position.y += dispFactorY * Math.sin(Math.sqrt(2)*ticks/fps + 2*2*Math.PI*x/maxX)/1000;
							//cube.position.z += Math.sin(ticks/fps + 2*2*Math.PI*z/maxZ)/1000;
							
							//cube.material.color.setHSL(cube_orig.h, cube_orig.s, cube_orig.l)
							
							//cube.rotation.x = Math.sin(ticks/fps * _y);
							//cube.rotation.y = Math.sin(1.5*ticks/fps * _x + Math.PI/2);
				}
			}
		}
	}
	
	renderer.render(scene, camera);
};

render();