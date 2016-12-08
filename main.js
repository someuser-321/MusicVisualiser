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
	
var config = {
	rRate : {
		max: 1,
		min: 0,
		val: 1 / 50
	},
	bgRate: {
		max: 1,
		min: 0,
		val: 1 / 10
	},
	cRate: {
		max: 1 / 100,
		min: 0,
		val: 1 / 400
	},
	cThresh: {
		max: -10,
		min: -50,
		val: -35
	},
	dispFactor: {
		max: 5,
		min: 0,
		val: 2
	},
	dispFactorX: {
		max: 1,
		min: 0,
		val: 1
	},
	dispFactorY: {
		max: 1,
		min: 0,
		val: 0.5
	},
	dispFactorZ: {
		max: 1,
		min: 0,
		val: 1
	},
	minFOV: {
		max: 90,
		min: 60,
		val: 85
	},
	maxFOV: {
		max: 120,
		min: 90,
		val: 95
	},
	minScale: {
		max: 4,
		min: 1,
		val: 1
	},
	maxScale: {
		max: 1,
		min: 0,
		val: 1
	},
    xFunc: {
        val: "disp * dispFactorX * Math.sin(ticks/fps*Math.abs(disp) + 2*Math.PI*yidx/maxY * zidx)/1000"
    },
    yFunc: {
        val: "disp * dispFactorY * Math.sin(Math.sqrt(2)*ticks/fps*Math.abs(disp) + 2*2*Math.PI*xidx/maxX * zidx)/1000"
    },
    zFunc: {
        val: "disp * dispFactorZ * Math.sin(ticks/fps*Math.abs(disp) + 2*2*Math.PI*zidx)/1000"
    }
};

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
	
var //minX = nCubesX/2,
	maxX = nCubesX/2,
	//minY = -4, //nCubesY/2,
	maxY = nCubesY/2,
	//minZ = -4,
	maxZ = nCubesZ;

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

var camera = new THREE.PerspectiveCamera((config.minFOV.val+config.maxFOV.val)/2, window.innerWidth/window.innerHeight, 0.001, 1000);
var controls = new THREE.PointerLockControls(camera);
controls.getObject().translateZ(maxZ/2);
controls.getObject().rotateZ(Math.PI/2);

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
			
			cube.position.x = /*minX + (maxX - minX) * ((i+0.5) / nCubesX); */ maxX*((i+0.5)/nCubesX-0.5);
			cube.position.y = /*minY + (maxY - minY) * ((j+0.5) / nCubesY); */ maxY*((j+0.5)/nCubesY-0.5);
			cube.position.z = /*minZ + (maxZ - minZ) * (k / nCubesZ); */ maxZ*((k+0.5)/nCubesZ-0.5);
			
			if ( !cubes[i] ) {
				cubes.push([]);
				cubes_orig.push([]);
			}
			if ( !cubes[i][j] ) {
				cubes[i].push([]);
				cubes_orig[i].push([]);
			}
			
			var hsl = material.color.getHSL();
			
			cubes[i][j].push(cube);
			cubes_orig[i][j].push({
				x: cube.position.x,
				y: cube.position.y,
				z: cube.position.z,
				h: hsl.h,
				s: hsl.s,
				l: hsl.l
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

var inpidx = 0;
var topOffset = 40;
for ( var a in config ) {
	if ( config.hasOwnProperty(a) )
	{
        if ( !a.endsWith("Func") ) 
        {
            var tmpControl = document.createElement("input");
                tmpControl.type = "range";
                tmpControl.min = config[a].min;
                tmpControl.max = config[a].max;
                tmpControl.step = (config[a].max-config[a].min) / 100;
                tmpControl.setAttribute("value", config[a].val);
                tmpControl.id = a;
                tmpControl.style.top = (25*inpidx) + topOffset + "px";
            
            var tmpLabel = document.createElement("span");
                tmpLabel.innerText = a + ":";
                tmpLabel.style.textAlign = "right";
                tmpLabel.style.top = (25*inpidx) + 2 + topOffset + "px";
            
            document.getElementById("inputs").appendChild(tmpLabel);
            document.getElementById("inputs").appendChild(tmpControl);
		} else {
            var tmpLabel = document.createElement("span");
                tmpLabel.innerText = a + ":";
                tmpLabel.style.top = (25*inpidx) + 22 + topOffset + "px";
                
            topOffset += 40;
            
            var tmpControl = document.createElement("textarea");
                tmpControl.id = a;
                tmpControl.value = config[a].val;
                tmpControl.style.top = (25*inpidx) + topOffset + "px";
                tmpControl.style.height = "40px";
                
            document.getElementById("inputs").appendChild(tmpLabel);
            document.getElementById("inputs").appendChild(tmpControl);
        }
		inpidx++;
	}
}


var tmpLabel = document.createElement("span");
    tmpLabel.innerHTML = "<u>Click the visualiser to hide the controls!</u><br/>" +
                         "W/S: Accelerate forwards/backwards<br/>" +
                         "A/D: Spin left/right<br/>" +
                         "X/C: Stop movement/rotation";
    tmpLabel.style.width = "400px";
    tmpLabel.style.top = (25*inpidx) + 37 + topOffset + "px";

document.getElementById("inputs").appendChild(tmpLabel);

    
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
			if ( document.pointerLockElement != document.getElementsByTagName("canvas")[0] ) {
                document.getElementById("inputs").style.display = "block";
				camLock = false;
            }
		});
        
        for ( var a in config ) {
            if ( !config[a].min ) {
                var tmp = document.getElementById(a).value;
                config[a].val = tmp;
            }
        }
        
        document.getElementById("inputs").style.display = "none";
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
		case "x":
			velocity = 0;
			break;
		case "c":
			rotVelocity = 0;
			break;
		case "k":
			if ( !showAxes ) {
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
		rotAccX = Math.sign(dx)*Math.sqrt(Math.abs(dx))/2000;
		rotAccY = Math.sign(dy)*Math.sqrt(Math.abs(dy))/2000;
}

window.addEventListener('resize', function (){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

var cidx = 0;

var render = function () {
	requestAnimationFrame(render);

	ticks++;
	
	controls.getObject().position.z += velocity/fps;
	//controls.getObject().translateZ(velocity/fps);
	
	rotVelX += rotAccX;
	rotVelY += rotAccY;
	
	rotAccX /= 2;
	rotAccY /= 2;
	
	rotVelX = Math.abs(rotVelX) < 0.00005 ? 0 : rotVelX/1.075;
	rotVelY = Math.abs(rotVelY) < 0.00005 ? 0 : rotVelY/1.075;
	
	controls.getObject().rotateX(-rotVelY);
	controls.getObject().rotateY(-rotVelX);
	controls.getObject().rotateZ(rotVelocity/fps);
	
	light1.position.z = controls.getObject().position.z - 1;
	
	
	for ( var a in config ) {
		if ( config[a].min )
		{
            var tmp = document.getElementById(a).value;
            config[a].val = parseFloat(tmp);
		}
	}
	
	var rRate = config.rRate.val,
		bgRate = config.bgRate.val,
		cRate = config.cRate.val,
		cThresh = config.cThresh.val,
		dispFactor = config.dispFactor.val,
		dispFactorX = config.dispFactorX.val,
		dispFactorY = config.dispFactorY.val,
		dispFactorZ = config.dispFactorZ.val,
		minFOV = config.minFOV.val,
		maxFOV = config.maxFOV.val,
		minScale = config.minScale.val,
		maxScale = config.maxScale.val,
        xFunc = config.xFunc.val,
        yFunc = config.yFunc.val,
        zFunc = config.zFunc.val;
		
		
	scene.background.setHSL(bgRate*ticks/fps, 1, 0);
	
	if ( analyser && !audio.ended )
	{
		analyser.getFloatFrequencyData(frequencyData);

		var fData = new Float32Array(frequencyData.length);
		var avgPow1 = 0,
			avgPow2 = 0,
			minPow1 = 1000,
			maxPow1 = -1000,
			minPow2 = 1000,
			maxPow2 = -1000;

		for ( var i=0 ; i<frequencyData.length ; i++ )
		{
			minPow1 = Math.min(minPow1, frequencyData[i]);
			maxPow1 = Math.max(maxPow1, frequencyData[i]);
			avgPow1 += frequencyData[i] / frequencyData.length;
		}
		
		for ( var i=0 ; i<frequencyData.length ; i++ )
		{
			fData[i] = (frequencyData[i]-minPow1)/(maxPow1-minPow1);
			avgPow2 += fData[i] / fData.length;
			minPow2 = Math.min(minPow2, fData[i]);
			maxPow2 = Math.max(maxPow2, fData[i]);
		}
	
		var avgPowers = [],
			avgAvgPowers = 0;
		for ( var i=0 ; i<nCubesX/2 ; i++ )
		{
			var avgPow3 = 0,
				binLen = (fData.length/(nCubesX/2))
				llim = i * binLen;
				
			for ( var j=0 ; j<binLen ; j++ ) {
				avgPow3 += fData[llim+j]/binLen;
			}
			avgPowers.push(avgPow3);
			avgAvgPowers += avgPow3/(nCubesX/2);
		}
		
		
		if ( maxPow1 > cThresh )
			cidx += cRate*Math.pow(Math.abs(maxPow1-cThresh), 1.65);
		
	
		for ( var i=0 ; i<nCubesX ; i++ )
		{
			var x_ = i/nCubesX,
				_x = i/nCubesX - 0.5,
				xidx = 0, //maxFreq*x_,
				disp = 0;
			
			if ( i < nCubesX/2 )
				xidx = nCubesX/2 - i - 1;
			else
				xidx = i - nCubesX/2;
			
			disp = dispFactor * avgPowers[xidx];
			disp = isNaN(disp) ? 0 : disp;
			
			for ( var j=0 ; j<nCubesY ; j++ )
			{
				var y_ = j/nCubesY,
					_y = j/nCubesY - 0.5,
					yidx = 0,
					dist = Math.sqrt(xidx*xidx+yidx*yidx);
			
				if ( j < nCubesY/2 )
					yidx = nCubesY/2 - j - 1;
				else
					yidx = j - nCubesY/2;
				
				for ( var k=0 ; k<nCubesZ ; k++ )
				{
					var cube = cubes[i][j][k];
					var cube_orig = cubes_orig[i][j][k];
					
					//cube.position.x = cube_orig.x;
					//cube.position.y = cube_orig.y;
					//cube.position.z = cube_orig.z;
					
					var x = cube.position.x,
						y = cube.position.y,
						z = cube.position.z;
					
					var z_ = k/nCubesZ,
						_z = k/nCubesZ - 0.5,
						zidx = 0;
				
					if ( k < nCubesZ/2 )
						zidx = nCubesZ/2 - k - 1;
					else
						zidx = k - nCubesZ/2;
					
					cube.position.z = cube_orig.z + disp;
					
                    var xDisp = eval(xFunc),
                        yDisp = eval(yFunc),
                        zDisp = eval(zFunc);
                    
					cube.position.x += xDisp;
					cube.position.y += yDisp;
					cube.position.z += xDisp;
					
					cube.scale.x =
					cube.scale.y =
					cube.scale.z = minScale + Math.abs(dist*avgPowers[xidx]*(maxScale-minScale));
					
					cube.material.color.setHSL(cidx+xidx/nCubesX+yidx/nCubesY, cube_orig.s, cube_orig.l);	//((ticks/cRate)%fps)/fps
					
					cube.rotation.x = Math.sin(ticks/fps * _y);
					cube.rotation.y = Math.sin(1.5*ticks/fps * _x + Math.PI/2);
				}
			}
		}
		
		camera.fov = maxFOV - avgPowers[0]*(maxFOV-minFOV);
		camera.updateProjectionMatrix();
	
	}
	
	renderer.render(scene, camera);
};

render();