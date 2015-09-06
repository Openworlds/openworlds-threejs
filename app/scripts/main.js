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
		this.folder.add(this, 'x');
		this.folder.add(this, 'y');
		this.folder.add(this, 'z');
		this.folder.add(this, 'yaw', -180, 180);
		this.folder.add(this, 'tilt', -180, 180);
		this.folder.add(this, 'roll', -180, 180);
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
	event.preventDefault();
	var mouse, obj = null;

	mouse = new THREE.Vector2();
	mouse.x =  ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
 
	raycaster.setFromCamera( mouse, camera );

	var intersects = raycaster.intersectObjects( scene.children, true );
	if ( intersects.length > 0 ) {
		// TODO: consider inspecting whole array!
		obj = intersects[0].object;
		while(obj.parent != scene)
			obj = obj.parent;
		if (!obj.userData || !obj.userData.isWorldObject)
			obj = null;
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
	scene.add( new THREE.GridHelper( 500, 1 ) );

	var light = new THREE.DirectionalLight( 0xffffff, 2 );
	light.position.set( 1, 1, 1 );
	scene.add( light );

	raycaster = new THREE.Raycaster();

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'mousedown', onDocumentMouseDown, false );

	control = new THREE.OrbitControls( camera );

	var loader = new THREE.RWXLoader();
	var objectCache = {};

	function loadObject(name,cb) {
		var propName = name.replace('.', '_');
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
				mesh.position.set( obj.x / 1000, (obj.y / 1000) + 0.6, obj.z / 1000 );
				//mesh.rotation.order = "YXZ";
				mesh.rotation.x = THREE.Math.degToRad(obj.tilt / 10);
				mesh.rotation.y = THREE.Math.degToRad(obj.yaw / 10);
				mesh.rotation.z = THREE.Math.degToRad(obj.roll / 10);
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
