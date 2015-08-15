var camera, scene, renderer, control, stats;

init();
render();

var ObjectOptions = function() {
  this.x = 0;
  this.y = 0;
  this.z = 0;
  this.yaw = 0;
  this.tilt = 0;
  this.roll = 0;
}

function init() {
  container = document.createElement( 'div' );
  document.body.appendChild( container );

  var info = document.createElement( 'div' );
  info.style.position = 'absolute';
  info.style.top = '10px';
  info.style.width = '100%';
  info.style.textAlign = 'center';
  info.innerHTML = '<a href="http://openworlds.github.io" target="_blank">OpenWorlds<a/> - Prototype client';
  container.appendChild( info );

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.sortObjects = false;
  container.appendChild( renderer.domElement );

  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  container.appendChild( stats.domElement );
 
  window.onload = function() {
    var options = new ObjectOptions();
    var gui = new dat.GUI();
    gui.add(options, 'x');
    gui.add(options, 'y');
    gui.add(options, 'z');
    gui.add(options, 'yaw');
    gui.add(options, 'tilt');
    gui.add(options, 'roll');
  };

  //

  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 3000 );
  camera.position.set( 1000, 500, 1000 );
  camera.lookAt( new THREE.Vector3( 0, 200, 0 ) );

  scene = new THREE.Scene();
  scene.add( new THREE.GridHelper( 500, 100 ) );

  var light = new THREE.DirectionalLight( 0xffffff, 2 );
  light.position.set( 1, 1, 1 );
  scene.add( light );

  control = new THREE.TransformControls( camera, renderer.domElement );
  control.addEventListener( 'change', render );

  var loader = new THREE.RWXLoader();
  loader.load( "models/stlmpt00.rwx", function(mesh) {
    mesh.scale.set( 500, 500, 500 );
    scene.add( mesh );
    control.attach( mesh );
    scene.add( control );
  });

  window.addEventListener( 'resize', onWindowResize, false );
  window.addEventListener( 'keydown', function ( event ) {
    //console.log(event.which);
    switch ( event.keyCode ) {
      case 81: // Q
        control.setSpace( control.space == "local" ? "world" : "local" );
        break;
      case 87: // W
        control.setMode( "translate" );
        break;
      case 69: // E
        control.setMode( "rotate" );
        break;
      case 82: // R
        control.setMode( "scale" );
        break;
      case 187:
      case 107: // +,=,num+
        control.setSize( control.size + 0.1 );
        break;
      case 189:
      case 10: // -,_,num-
        control.setSize( Math.max(control.size - 0.1, 0.1 ) );
        break;
    }
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

  render();
}

function render() {
  control.update();
  renderer.render( scene, camera );
  stats.update();
}
