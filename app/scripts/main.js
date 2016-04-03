var camera, scene, renderer, control = null, stats;
var container = $('#container')[0];
var raycaster, gui;

var selectedObj = null;

var clock = new THREE.Clock();

// Fix missing removeFolder in dat.GUI
// See https://code.google.com/p/dat-gui/issues/detail?id=21
dat.GUI.prototype.removeFolder = function(folder) {
	var name = folder.name;
	this.__folders[name].close();
	this.__folders[name].domElement.parentNode.parentNode.removeChild(this.__folders[name].domElement.parentNode);
	this.__folders[name] = undefined;
	this.onResize();
}

var EditObjectOptions = function(obj) {
	this.object = obj;
	this.origPosition = obj.position.clone();
	this.origRotation = obj.rotation.clone();
	this.x = obj.position.x;
	this.y = obj.position.y;
	this.z = obj.position.z;
	this.yaw = THREE.Math.radToDeg(obj.rotation.y);
	this.tilt = THREE.Math.radToDeg(obj.rotation.x);
	this.roll = THREE.Math.radToDeg(obj.rotation.z);

	this.add = function() {
		this.folder = gui.addFolder(obj.name);
		this.folder.add(this, 'x').step(0.001).onFinishChange(function(x) {
			obj.position.x = x;
		});
		this.folder.add(this, 'y').step(0.001).onFinishChange(function(y) {
			obj.position.y = y;
		});
		this.folder.add(this, 'z').step(0.001).onFinishChange(function(z) {
			obj.position.z = z;
		});
		this.folder.add(this, 'yaw', -180, 180).step(0.001).onChange(function(yaw) {
			obj.rotation.y = THREE.Math.degToRad(yaw);
		});
		this.folder.add(this, 'tilt', -180, 180).step(0.001).onChange(function(tilt) {
			obj.rotation.x = THREE.Math.degToRad(tilt);
		});
		this.folder.add(this, 'roll', -180, 180).step(0.001).onChange(function(roll) {
			obj.rotation.z = THREE.Math.degToRad(roll);
		});
		this.folder.open();
	}

	this.remove = function() {
		gui.removeFolder(this.folder);
	}
};

init();

function selectObject( obj ) {
	// Remove object options of previously selected object
	if (selectedObj)
		selectedObj.remove();

	selectedObj = obj ? new EditObjectOptions(obj) : null;

	// Add object options of newly selected object
	if (selectedObj)
		selectedObj.add();
}

function onDocumentMouseDown( event ) {
	if (event.button != 2)
		return;

	event.preventDefault();
	var mouse, distance = 1000, obj = null;

	mouse = new THREE.Vector2();
	mouse.x =  ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
 
	raycaster.setFromCamera( mouse, camera );

	var intersects = raycaster.intersectObjects( scene.children, true );
	if ( intersects.length > 0 ) {
		for (var i = 0; i < intersects.length; i++) {
			var o = intersects[i].object;
			while(o.parent != scene)
				o = o.parent;
			if (o.userData && o.userData.isWorldObject &&
					intersects[i].distance < distance) {
				obj = o;
				distance = intersects[i].distance;
			}
		}
	}

	selectObject( obj );
}


function init() {
	// Add renderer
	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.sortObjects = false;
	container.appendChild( renderer.domElement );

	// three.js statistics
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.top = '0px';
	container.appendChild( stats.domElement );
 
	// dat.GUI options
	gui = new dat.GUI();

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.001, 3000 );
	camera.position.set(2,2,4);

	scene = new THREE.Scene();
	scene.add( new THREE.GridHelper( 20, 1 ) );

	var ambient = new THREE.AmbientLight( 0x777777 );
	scene.add( ambient );

	raycaster = new THREE.Raycaster();

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'mousedown', onDocumentMouseDown, false );

	control = new THREE.OrbitControls( camera, renderer.domElement );
	control.enableKeys = false; // keys interfere with dat.GUI

	var loader = new THREE.RWXLoader();
	var objectCache = {};

	function loadObject(name,cb) {
		var propName = name.replace('.', '_');
		if (name.indexOf('.') < 0)
			name += '.rwx';
		if (!objectCache.hasOwnProperty(propName)) {
			objectCache[propName] = { loaded: false, mesh: null, callbacks: [cb] };
			loader.load( 'models/' + name, function(mesh) {
				mesh.userData = { isWorldObject: true };
				objectCache[propName].mesh = mesh;
				objectCache[propName].loaded = true;
				objectCache[propName].callbacks.forEach( function(cb) {
					cb(mesh.clone());
				});
			});
		} else {
			if (!objectCache[propName].loaded)
				objectCache[propName].callbacks.push(cb);
			else
				cb(objectCache[propName].mesh.clone());
		}
	}

	$.getJSON('http://0.0.0.0:3000/api/objects/', function(objects) {
		objects.forEach(function(obj) {
			loadObject( obj.model, function(mesh) {
				mesh.position.set(
						obj.x,
						obj.y,
						obj.z );
				mesh.rotation.set(
						THREE.Math.degToRad(obj.tilt),
						THREE.Math.degToRad(obj.yaw),
						THREE.Math.degToRad(obj.roll) );
				scene.add( mesh );
			});
		});
	});
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

	render();
}

function render() {
	if (control)
		control.update(clock.getDelta());

	renderer.render( scene, camera );
	stats.update();
}

function animate() {
	requestAnimationFrame( animate );
	render();
}

animate();
