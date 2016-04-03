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
 * Missing geomtry shapes:
 * - Block, Cone, Cylinder, Disc, Hemisphere, Sphere
 * Missing material commands:
 * - Material{Begin,End}
 * - {Add,Remove}MaterialMode
 * - {Add,Remove}TextureMode
 * - TextureAddressMode
 * - TextureMode
 * - Texture
 * - GeometrySampling
 * - LightSampling
 * - AxisAlignment
 * Missing misc. commands:
 * - ProtoInstanceGeometry
 * - Collision
 * - Identity
 * - Tag
 * Missing AW Extensions:
 * - OpacityFix
 * - Prelight
 * - Seamless
 * - RandomUVs
 * - TextureAddressMode
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

		var textureLoader = new THREE.TextureLoader();
		textureLoader.crossOrigin = '';

		var transform_stack = [];
		var pos = url.lastIndexOf('/');
		var name = (pos != -1) ? url.slice(pos + 1) : url;
		pos = name.lastIndexOf('.');
		if (pos != -1)
			name = name.substr(0, pos);

		var container = new THREE.Object3D();
		container.name = name;

		var obj = container;
		var clumpnum = 0;
		var protos = {};
		var uvs = [];

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

			uvs = [];

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

			} else if (obj.material !== undefined &&
					obj.material.materials.length == 0) {

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

		var vertex_pattern = /(vertex|vertexext)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)( uv(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+))?/;

		// triangle int int int

		var triangle_pattern = /triangle(\s+-?\d+)(\s+-?\d+)(\s+-?\d+)/;

		// quad int int int int

		var quad_pattern = /quad(\s+-?\d+)(\s+-?\d+)(\s+-?\d+)(\s+-?\d+)/;

		// polygon int int..
		// XXX fix "varargs" support in here

		var polygon_pattern = /polygon(\s+-?\d+)(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?(\s+-?\d+)?/;

		// protobegin name

		var protobegin_pattern = /protobegin(\s[_a-z0-9]+)/;

		// protoinstance name

		var protoinstance_pattern = /protoinstance(\s[_a-z0-9]+)/;

		// color float float float

		var color_pattern = /color(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)/;

		// surface float float float

		var surface_pattern = /surface(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)/;

		// ambient float

		var ambient_pattern = /ambient(\s+[\d|\.|\+|\-|e|E]+)/;

		// diffuse float

		var diffuse_pattern = /diffuse(\s+[\d|\.|\+|\-|e|E]+)/;

		// specular float

		var specular_pattern = /specular(\s+[\d|\.|\+|\-|e|E]+)/;

		// opacity float

		var opacity_pattern = /opacity(\s+[\d|\.|\+|\-|e|E]+)/;

		// rotate bool bool bool int

		var rotate_pattern = /rotate(\s+[0|1])(\s+[0|1])(\s+[0|1])(\s+-?\d+)/;

		// translate float float float

		var translate_pattern = /translate(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)/;

		// scale float float float

		var scale_pattern = /scale(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)/;

		// identity

		var identity_pattern = /identity/;

		// transform float float float float float float float float float float float float float float float float

		var transform_pattern = /transform(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)(\s+[\d|\.|\+|\-|e|E]+)/;

		// texture name [type name]

		var texture_pattern = /texture ([\w|\.|_|-]+)( mask| bump)?( [\w|\.]+)?/;

		// texturemode mode

		var texturemode_pattern = /texturemode[s]? ([\w]+)+/;

		// geometrysampling mode

		var geometrysampling_pattern = /geometrysampling ([\w]+)/;

		// materialmode mode

		var materialmode_pattern = /materialmode[s]?(\s+[double|null])/;

		// lightsampling mode

		var lightsampling_pattern = /lightsampling\s+([\w]+)/;

		// opacityfix [on | off]
		var opacityfix_pattern = /opacityfix\s+([\w]+)/;

		// collision [on | off]
		var collision_pattern = /collision\s+([\w]+)/;

		// axisaligment [zorientx / zorienty | none]
		var axisalignment_pattern = /axisalignment\s+([\w]+)/;

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

			} else if ( line == "transformbegin" ) {

				transform_stack.push( matrix );

			} else if ( line == "transformend" ) {

				matrix.copy( transform_stack.pop() );

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
					parseFloat( result[2] ),
					parseFloat( result[3] ),
					parseFloat( result[4] )
					) );

				if (result.length > 5) {
					uvs.push( new THREE.Vector2(
						parseFloat( result[6] ),
						parseFloat( result[7] )
						) );
				}

			} else if ( ( result = triangle_pattern.exec( line ) ) !== null ) {

				if (mat_changed) {
					update_materials();
				}

				var
					a = parseInt( result[1] ) -1,
					b = parseInt( result[2] ) -1,
					c = parseInt( result[3] ) -1;

				obj.geometry.faces.push( new THREE.Face3(
					a, b, c,
					null, null, obj.material.materials.length -1
					) );

				obj.geometry.faceVertexUvs[0].push( [
						uvs[a], uvs[b], uvs[c]
					] );

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
				obj.geometry.faceVertexUvs[0].push( [
						uvs[ indices[0] ], uvs[ indices[1] ], uvs[ indices[2] ]
					] );

				obj.geometry.faces.push( new THREE.Face3(
					indices[0], indices[2], indices[3],
					null, null, obj.material.materials.length -1 )
				);
				obj.geometry.faceVertexUvs[0].push( [
						uvs[ indices[0] ], uvs[ indices[2] ], uvs[ indices[3] ]
					] );

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

				// TODO: implement

			} else if ( ( result = ambient_pattern.exec( line ) ) !== null ) {

				// TODO: implement

			} else if ( ( result = diffuse_pattern.exec( line ) ) !== null ) {

				// TODO: implement

			} else if ( ( result = specular_pattern.exec( line ) ) !== null ) {

				// TODO: implement

			} else if ( ( result = opacity_pattern.exec( line ) ) !== null ) {

				mat.opacity = parseFloat( result[1] );
				mat.transparent = mat.opacity != 1.0;
				mat_changed = true;

			} else if ( ( result = opacityfix_pattern.exec( line ) ) !== null ) {

				// TODO: implement

			} else if ( ( result = collision_pattern.exec( line ) ) !== null ) {

				// TODO: implement

			} else if ( ( result = axisalignment_pattern.exec( line ) ) !== null ) {

				// TODO: implement

			} else if ( ( result = rotate_pattern.exec( line ) ) !== null ) {

				// Build transform matrix from input
				var
					m = new THREE.Matrix4();
					mx = new THREE.Matrix4(),
					my = new THREE.Matrix4(),
					mz = new THREE.Matrix4();
					x = parseInt( result[1] ) == 1,
					y = parseInt( result[2] ) == 1,
					z = parseInt( result[3] ) == 1,
					angle = THREE.Math.degToRad( parseInt( result[4] ) );
				if ( x ) mx.makeRotationX( angle );
				if ( y ) my.makeRotationY( angle );
				if ( z ) mz.makeRotationY( angle );
				m.multiplyMatrices(mx, my);
				m.multiply(mz);

				// Apply outcome to current matrix
				matrix.multiply(m);

			} else if ( ( result = translate_pattern.exec( line ) ) !== null ) {

				var m = new THREE.Matrix4().makeTranslation(
					parseFloat( result[1] ),
					parseFloat( result[2] ),
					parseFloat( result[3] )
				);
				matrix.multiply(m);

			} else if ( ( result = scale_pattern.exec( line ) ) !== null ) {

				var m = new THREE.Matrix4().makeScale(
					parseFloat( result[1] ),
					parseFloat( result[2] ),
					parseFloat( result[3] )
				);
				matrix.multiply(m);

			} else if ( ( result = identity_pattern.exec( line ) ) !== null ) {

				matrix.identity();

			} else if ( ( result = transform_pattern.exec( line ) ) !== null ) {

				matrix.set(
					parseFloat( result[1].trim() ),
					parseFloat( result[2].trim() ),
					parseFloat( result[3].trim() ),
					parseFloat( result[4].trim() ),
					parseFloat( result[5].trim() ),
					parseFloat( result[6].trim() ),
					parseFloat( result[7].trim() ),
					parseFloat( result[8].trim() ),
					parseFloat( result[9].trim() ),
					parseFloat( result[10].trim() ),
					parseFloat( result[11].trim() ),
					parseFloat( result[12].trim() ),
					parseFloat( result[13].trim() ),
					parseFloat( result[14].trim() ),
					parseFloat( result[15].trim() ),
					parseFloat( result[16].trim() )
				);

			} else if ( ( result = texture_pattern.exec( line ) ) !== null ) {

				if (result[1].trim() != 'null') {
					var texUrl = (this.texturePath || 'textures') + '/' + result[1].trim();
					if (result[1].indexOf('.') < 0)
						texUrl += '.jpg';
					mat.map = textureLoader.load( texUrl, function(tex) {
						tex.flipY = false;
						tex.wrapS =
						tex.wrapT = THREE.RepeatWrapping;
					} );
				} else {
					mat.map = null;
				}
				mat_changed = true;

			} else if ( ( result = texturemode_pattern.exec( line ) ) !== null ) {

				// TODO: implement

			} else if ( ( result = geometrysampling_pattern.exec( line ) ) !== null ) {

				mat.wireframe = (result[1] == "wireframe");
				mat_changed = true;

			} else if ( ( result = materialmode_pattern.exec( line ) ) !== null ) {

				// TODO: implement

			} else if ( ( result = lightsampling_pattern.exec( line ) ) !== null ) {

				// TODO: implement

			} else {

				console.log( "Unhandled:", line );

			}
		}

		console.timeEnd( 'RWXLoader ' + name );

		return container;
	}
}
