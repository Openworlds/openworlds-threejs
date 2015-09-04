/*
 * @author ithamar / https://github.com/openworlds
 *
 *
 * Prototype RWXLoader, currently builds hierachy of
 * nodes for a single RWX "clump".
 * *
 * For performance, we might want to generate a BufferGeometry,
 * especially once we start instancing for full world scenes.
 * However, this complicates the material handling, as there
 * can only be a single material per BufferGeometry, so we
 * will still need multiple nodes for a single object.
 *
 * For now, get something working that we can use to render full
 * world scenes, and then let the profiling begin!
 *
 * Major functionality still missing:
 *   * texture handling
 *   * lighting (both vertex and facet based)
 *   * Lots of 'generic' commands...
 */

THREE.RWXLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.RWXLoader.prototype = {

	constructor: THREE.RWXLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		loader.setCrossOrigin( this.crossOrigin );
		loader.load( url, function ( text ) {

			onLoad( scope.parse( url, text ) );

		}, onProgress, onError );

	},

	parse: function ( url, text ) {

		var name = 'untitled';
		var pos = url.lastIndexOf('/');
		if (pos != -1)
			name = url.slice(pos +1);

		var container = new THREE.Object3D();
		container.name = name;

		var obj = container;
		var clumpnum = 0;
		var protos = {}

		var mat = new THREE.MeshBasicMaterial({
			color: '#ffffff',
			wireframe: false
		});
		mat.opacity = 1.0;
		mat.transparent = false;
		var mat_changed = true;
		var matrix = new THREE.Matrix4();

		function update_materials() {
			// clone and store current material state
			obj.material.materials.push( mat.clone() );
			mat_changed = false;
		}

		function start_object(name, type) {
			var parent_ = obj;

			obj = new THREE.Mesh( new THREE.Geometry );
			obj.material = new THREE.MeshFaceMaterial([]);
			obj.name = (name !== null) ? name : "clump" + clumpnum++;

			if (type != "proto") {

				if (parent_ != null)
					parent_.add(obj);

			} else {

				obj.is_proto = true;

			}
		}

		function end_object() {
			if (obj == null) {
				return;
			}

			if (obj.is_proto) {

				protos[obj.name] = obj;

			} else if (obj.material.materials.length == 0) {

				var new_obj = new THREE.Object3D();
				var parent_ = obj.parent;
				
				new_obj.name = obj.name;

				// Empty object, just children
				while(obj.children.length) {
					var child = obj.children[0];
					obj.remove(child);
					new_obj.add(child);
				}

				parent_.remove(obj);
				parent_.add(new_obj);
			}

			obj = container;
		}

		console.time( 'RWXLoader ' + name );

		var lines = text.split( '\n' );

		// vertex float float float

		var vertex_pattern = /vertex( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;

		// triangle int int int

		var triangle_pattern = /triangle( +-?\d+)( +-?\d+)( +-?\d+)/;

		// quad int int int int	

		var quad_pattern = /quad( +-?\d+)( +-?\d+)( +-?\d+)( +-?\d+)/;

		// polygon int int..
		// XXX fix "varargs" support in here

		var polygon_pattern = /polygon( +-?\d+)( +-?\d+)?( +-?\d+)?( +-?\d+)?( +-?\d+)?( +-?\d+)?( +-?\d+)?( +-?\d+)?( +-?\d+)?( +-?\d+)?( +-?\d+)?( +-?\d+)?( +-?\d+)?/;

		// protobegin name

		var protobegin_pattern = /protobegin( [a-z0-9]+)/;

		// protoinstance name

		var protoinstance_pattern = /protoinstance( [a-z0-9]+)/;

		// color float float float

		var color_pattern = /color( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;

		// surface float float float

		var surface_pattern = /surface( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;

		// opacity float

		var opacity_pattern = /opacity( +[\d|\.|\+|\-|e|E]+)/;

		// rotate bool bool bool int

		var rotate_pattern = /rotate( [0|1])( [0|1])( [0|1])( +-?\d+)/;

		// translate float float float
	
		var translate_pattern = /translate( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;

		// texture name [type name]
		
		var texture_pattern = /texture ([\w|\.]+) (mask|bump)? ([\w|\.]+)?/;

		// texturemode mode

		var texturemode_pattern = /texturemode ([\w]+)+/;

		// geometrysampling mode

		var geometrysampling_pattern = /geometrysampling ([\w]+)/;

		// materialmode mode

		var materialmode_pattern = /materialmode( [double|null])/;

		// lightsampling mode

		var lightsampling_pattern = /lightsampling ([\w]+)/;

		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ];
			line = line.trim().toLowerCase();

			var pos = line.indexOf( '#' );
			if (pos >= 0)
				line = line.substr(0, pos-1).trim();

			var result;

			if (line.length == 0) {

				continue;

			} else if (line == "modelbegin" || line == "modelend") {

				continue;

			} else if (line == "clumpbegin") {

				start_object(null, "clump");

			} else if (line == "clumpend") {

				end_object();

			} else if ( ( result = protobegin_pattern.exec( line ) ) !== null ) {

				start_object( result[1], "proto" );

			} else if (line == "protoend") {

				end_object();

			} else if ( ( result = protoinstance_pattern.exec( line ) ) !== null ) {

				if ( protos[ result[1] ] !== null ) {
					var new_obj = protos[ result[1] ].clone();
					new_obj.applyMatrix( matrix );
					obj.add( new_obj );
				}

			} else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {

				obj.geometry.vertices.push( new THREE.Vector3(
					parseFloat( result[1] ),
					parseFloat( result[2] ),
					parseFloat( result[3] )
					) );

			} else if ( ( result = triangle_pattern.exec( line ) ) !== null ) {

				if (mat_changed) {
					update_materials();
				}

				obj.geometry.faces.push( new THREE.Face3(
					parseInt( result[1] ) -1,
					parseInt( result[2] ) -1,
					parseInt( result[3] ) -1,
					null, null, obj.material.materials.length -1
					) );

			} else if ( ( result = quad_pattern.exec( line ) ) !== null ) {

				if (mat_changed) {
					update_materials();
				}

				var indices = [
					parseInt( result[1] ) -1,
					parseInt( result[2] ) -1,
					parseInt( result[3] ) -1,
					parseInt( result[4] ) -1,
				];

				obj.geometry.faces.push( new THREE.Face3(
					indices[0], indices[1], indices[2],
					null, null, obj.material.materials.length -1 )
				);
				obj.geometry.faces.push( new THREE.Face3(
					indices[0], indices[2], indices[3],
					null, null, obj.material.materials.length -1 )
				);

			} else if ( ( result = polygon_pattern.exec( line ) ) !== null ) {

				if (mat_changed) {
					update_materials();
				}

				var count = result[1];
				var start = parseInt( result[2] ) -1;

				for (var j = 3; j <= count; j++) {
					obj.geometry.faces.push(new THREE.Face3(
						start,
						parseInt( result[j] ) -1,
						parseInt( result[j+1] ) -1,
						null, null, obj.material.materials.length -1
					) );
				}
			} else if ( ( result = color_pattern.exec( line ) ) !== null ) {

				mat.color = new THREE.Color(
					parseFloat( result[1] ),
					parseFloat( result[2] ),
					parseFloat( result[3] )
					);

				mat_changed = true;

			} else if ( ( result = surface_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = opacity_pattern.exec( line ) ) !== null ) {

				mat.opacity = parseFloat( result[1] );
				mat.transparent = mat.opacity != 1.0;
				mat_changed = true;

			} else if ( ( result = rotate_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = translate_pattern.exec( line ) ) !== null ) {

				var m = new THREE.Matrix4().makeTranslation(
					parseFloat( result[1] ),
					parseFloat( result[2] ),
					parseFloat( result[3] )
				);
				matrix.multiply(m);

			} else if ( ( result = texture_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = texturemode_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = geometrysampling_pattern.exec( line ) ) !== null ) {

				mat.wireframe = (result[1] == "wireframe");
				mat_changed = true;

			} else if ( ( result = materialmode_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = lightsampling_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else {

				console.log( "Unhandled:", line );

			}
		}

		console.timeEnd( 'RWXLoader ' + name );

		return container;
	}
}
