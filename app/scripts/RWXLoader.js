/*
 * @author ithamar / https://github.com/openworlds
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

			onLoad( scope.parse( text ) );

		}, onProgress, onError );

	},

	parse: function ( text ) {

		var container;

		var texture = THREE.ImageUtils.loadTexture( 'images/crate.gif', THREE.UVMapping, render );
		texture.anisotropy = renderer.getMaxAnisotropy();

		var obj = null;
		var clumpnum = 0;
		var protos = {}

		var color = new THREE.Color( 1.0, 1.0, 1.0 );
		var opacity = 1.0;
		var wireframe = false;
		var mat_changed = true;

		function update_materials() {
			var mat = new THREE.MeshBasicMaterial({
				color: color,
				wireframe: wireframe
			});
			mat.opacity = opacity;
			if (opacity != 1.0)
				mat.transparent = true;
			obj.mats.push( mat );
			mat_changed = false;
		}

		function start_object(name, type) {
			obj = {
				name: (name !== null) ? name : "clump" + clumpnum++,
				type: type,
				geo: new THREE.Geometry(),
				children: [],
				mats: [],
				parent_: obj,
			};
		}

		function end_object() {
			if (obj == null) {
				return;
			}

			if (obj.type == "proto") {
				protos[obj.name] = obj;
				return;
			}

			if (obj.parent_ != null)
				obj.parent_.children.push(obj);
		}

		console.time( 'RWXLoader' );

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

		var rotate_pattern = /surface( [0|1])( [0|1])( [0|1])( +-?\d+)/;

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

				console.log( result );

			} else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {

				obj.geo.vertices.push( new THREE.Vector3(
					parseFloat( result[1] ),
					parseFloat( result[2] ),
					parseFloat( result[3] )
					) );

			} else if ( ( result = triangle_pattern.exec( line ) ) !== null ) {

				if (mat_changed) {
					update_materials();
				}

				obj.geo.faces.push( new THREE.Face3(
					parseInt( result[1] ) -1,
					parseInt( result[2] ) -1,
					parseInt( result[3] ) -1,
					null, null, obj.mats.length -1
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

				obj.geo.faces.push( new THREE.Face3( indices[0], indices[1], indices[2], null, null, obj.mats.length -1 ) );
				obj.geo.faces.push( new THREE.Face3( indices[0], indices[2], indices[3], null, null, obj.mats.length -1 ) );

			} else if ( ( result = polygon_pattern.exec( line ) ) !== null ) {

				if (mat_changed) {
					update_materials();
				}

				var count = result[1];
				var start = parseInt( result[2] ) -1;

				for (var j = 3; j <= count; j++) {
					obj.geo.faces.push(new THREE.Face3(
						start,
						parseInt( result[j] ) -1,
						parseInt( result[j+1] ) -1,
						null, null, obj.mats.length -1
					) );
				}
			} else if ( ( result = color_pattern.exec( line ) ) !== null ) {

				color = new THREE.Color(
					parseFloat( result[1] ),
					parseFloat( result[2] ),
					parseFloat( result[3] )
					);

				mat_changed = true;

			} else if ( ( result = surface_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = opacity_pattern.exec( line ) ) !== null ) {

				opacity = parseFloat( result[1] );
				mat_changed = true;

			} else if ( ( result = rotate_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = translate_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = texture_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = texturemode_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = geometrysampling_pattern.exec( line ) ) !== null ) {

				wireframe = result[1] == "wireframe";
				mat_changed = true;

			} else if ( ( result = materialmode_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else if ( ( result = lightsampling_pattern.exec( line ) ) !== null ) {

				console.log( result );

			} else {

				console.log( "Unhandled:", line );

			}
		}

		console.timeEnd( 'RWXLoader' );

		console.log(protos);
		console.log(obj);
		container = new THREE.Mesh( obj.geo, new THREE.MeshFaceMaterial( obj.mats ) );
		console.log(container);

		return container;
	}
}
