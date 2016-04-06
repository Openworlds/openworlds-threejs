/*
 * @author ithamar / https://github.com/openworlds
 *
 * For more information, see RWXLoader.md
 */

THREE.RWXLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

	this.textureLoader = new THREE.TextureLoader();
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
		// Build base name of object
		var pos = url.lastIndexOf('/');
		var name = (pos != -1) ? url.slice(pos + 1) : url;
		pos = name.lastIndexOf('.');
		if (pos != -1)
			name = name.substr(0, pos);

		console.time( 'RWXLoader ' + name );

		this.transformStack = [];
		this.currMatrix = new THREE.Matrix4();
		this.vertices = [];
		this.currMaterial = new THREE.MeshBasicMaterial();
		this.materialChanged = false;
		this.clumpNum = 0;
		this.protoTable = [];
		this.currObject = null;

		this.currObject = new THREE.Mesh(new THREE.Geometry);
		this.currObject.material = new THREE.MeshFaceMaterial([]);
		this.container = this.currObject;
		this.container.name = name;

		var lines = text.split('\n');
		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ];
			line = line.trim().toLowerCase();

			// TODO: check AW extension marker?
			var pos = line.indexOf( '#' );
			if (pos >= 0)
				line = line.substr(0, pos-1).trim();

			if (line.length == 0) {

				continue;

			}

			var parts = line.split(/\s+/);
			if (parts == null || parts.length == 0) {

				continue;

			}

			var handler = this["rwx_" + parts[0]];
			if (handler == null) {

				console.warn(name + ': Unhandled command "' + parts[0] + '"');

			} else if (typeof handler !== "function") {

				console.error(name + ': command handler rwx_' + parts[0] + ' is not function!')

			} else {

				handler.call(this,parts);
			}
		}

		console.timeEnd( 'RWXLoader ' + name );

		this.container.geometry.mergeVertices();
		// DEBUG: console.log( this.container );

		return this.container;
	},

	startObject: function(name, type) {
		var name = name || ("clump" + this.clumpNum++);
		//DEBUG: console.log('start: file=' + this.container.name + ', name='+name+',type='+type);
		var objParent = this.currObject;

		this.currObject = new THREE.Mesh( new THREE.Geometry );
		this.currObject.material = new THREE.MeshFaceMaterial([]);
		this.currObject.name = (name !== null) ? name : "clump" + this.clumpNum++;
		this.currObject.isProto = (type == "proto");

		this.vertices = [];

		objParent.add( this.currObject );
	},

	endObject: function() {
		//DEBUG: console.log('end: file=' + this.container.name + ', name='+(this.currObject?this.currObject.name:"null"));

		var parent = this.currObject.parent;
		parent.remove( this.currObject );
		if (this.currObject.isProto) {

			this.protoTable[this.currObject.name] = this.currObject;

		} else {
			parent.geometry.merge( this.currObject.geometry, undefined, parent.material.materials.length );
			Array.prototype.push.apply(
					parent.material.materials,
					this.currObject.material.materials
			);
		}

		/* TODO else if (this.currObject.material !== undefined &&
				this.currObject.material.materials.length == 0) {

			var new_obj = new THREE.Object3D();

			new_obj.name = this.currObject.name;
			new_obj.add( this.currentObject.children );

			// Empty object, just children
			while(this.currObject.children.length) {
				var child = this.currObject.children[0];
				this.currObject.remove(child);
				new_obj.add(child);
			}

			if (parent_)
				parent_.add(new_obj);
		}*/

		this.currObject = parent;
		this.vertices = [];
	},

	// RWX: Structural
	rwx_modelbegin: function(args) {
		// Intentionally ignored, optionally wraps the object
	},
	rwx_modelend: function(args) {
		// Intentionally ignored, optionally wraps the object
	},
	rwx_clumpbegin: function(args) {
		this.startObject(null, 'clump');
	},
	rwx_clumpend: function(args) {
		this.endObject();
	},
	rwx_protobegin: function(args) {
		this.startObject(args[1], 'proto');
	},
	rwx_protoend: function(args) {
		this.endObject();
	},
	rwx_protoinstance: function(args) {
		if ( this.protoTable[ args[1] ] !== null ) {
			var proto = this.protoTable[ args[1] ];
			this.currObject.geometry.merge( proto.geometry, this.currMatrix, this.currObject.material.materials.length );
			Array.prototype.push.apply(
					this.currObject.material.materials,
					proto.material.materials
			);
		}
	},

	// RWX: geometry
	_rwx_vertex: function(args) {
		var vec = new THREE.Vector3(
			parseFloat( args[1] ),
			parseFloat( args[2] ),
			parseFloat( args[3] )
		);

		var uv = new THREE.Vector2();
		if (args.length > 5 && args[4] == 'uv') {
			uv.set(
				parseFloat( args[5] ),
				parseFloat( args[6] )
			);
		}

		this.vertices.push( {
			vec: vec,
			uv: uv,
		} );
	},
	rwx_vertex: function(args) {
		this._rwx_vertex(args);
	},
	rwx_vertexext: function(args) {
		this._rwx_vertex(args);
	},

	updateMaterials: function() {
		if (this.materialChanged) {
			// clone and store current material state
			this.currObject.material.materials.push( this.currMaterial.clone() );
			this.materialChanged = false;
		}
	},

	addTriangle: function(a,b,c) {
		var idx = this.currObject.geometry.vertices.length;
		this.currObject.geometry.vertices.push(
			this.vertices[a].vec.clone().applyMatrix4( this.currMatrix ),
			this.vertices[b].vec.clone().applyMatrix4( this.currMatrix ),
			this.vertices[c].vec.clone().applyMatrix4( this.currMatrix )
		);

		this.currObject.geometry.faces.push( new THREE.Face3(
			idx, idx + 1, idx + 2,
			null, null, this.currObject.material.materials.length -1
		) );

		this.currObject.geometry.faceVertexUvs[0].push( [
			this.vertices[a].uv, this.vertices[b].uv, this.vertices[c].uv
		] );
	},

	rwx_triangle: function(args) {
		this.updateMaterials();

		var
			a = parseInt( args[1] ) -1,
			b = parseInt( args[2] ) -1,
			c = parseInt( args[3] ) -1;

		this.addTriangle( a, b, c );
	},
	rwx_quad: function(args) {
		this.updateMaterials();

		var indices = [
			parseInt( args[1] ) -1,
			parseInt( args[2] ) -1,
			parseInt( args[3] ) -1,
			parseInt( args[4] ) -1,
		];

		this.addTriangle( indices[0], indices[1], indices[2] );
		this.addTriangle( indices[0], indices[2], indices[3] );
	},
	rwx_polygon: function(args) {
		this.updateMaterials();

		var count = parseInt( args[1] );
		var a = parseInt( args[2] ) -1;

		for (var j = 3; j <= count; j++) {
			var b = parseInt( args[j] ) -1,
			    c = parseInt( args[j+1] ) -1;

			this.addTriangle(a, b, c);
		}
	},

	// RWX: Material
	rwx_color: function(args) {
		this.currMaterial.color = new THREE.Color(
			parseFloat( args[1] ),
			parseFloat( args[2] ),
			parseFloat( args[3] )
		);

		this.materialChanged = true;
	},
	rwx_surface: function(args) {
	},
	rwx_ambient: function(args) {
	},
	rwx_diffuse: function(args) {
	},
	rwx_specular: function(args) {
	},
	rwx_lightsampling: function(args) {
	},
	rwx_geometrysampling: function(args) {
		this.currMatrix.wireframe = (args[1] == "wireframe");
		this.materialChanged = true;
	},
	rwx_opacity: function(args) {
		this.currMaterial.opacity = parseFloat( args[1] );
		this.currMaterial.transparent = this.currMaterial.opacity != 1.0;
		this.materialChanged = true;
	},
	rwx_opacityfix: function(args) {
	},
	rwx_texture: function(args) {
		if (args[1] != 'null') {
			var texUrl = (this.texturePath || 'textures') + '/' + args[1];
			if (args[1].indexOf('.') < 0)
				texUrl += '.jpg';
			this.currMaterial.map = this.textureLoader.load( texUrl, function(tex) {
				tex.flipY = false;
				tex.wrapS =
				tex.wrapT = THREE.RepeatWrapping;
			} );
		} else {
			this.currMaterial.map = null;
		}
		this.materialChanged = true;

	},
	rwx_texturemodes: function(args) {
	},
	rwx_addtexturemode: function(args) {
	},
	rwx_materialmodes: function(args) {
	},
	rwx_addmaterialmode: function(args) {
	},

	// RWX: Matrix
	rwx_identity: function(args) {
		this.currMatrix.identity();
	},
	rwx_translate: function(args) {
		var m = new THREE.Matrix4().makeTranslation(
			parseFloat( args[1] ),
			parseFloat( args[2] ),
			parseFloat( args[3] )
		);
		this.currMatrix.multiply(m);
	},
	rwx_scale: function(args) {
		var m = new THREE.Matrix4().makeScale(
			parseFloat( args[1] ),
			parseFloat( args[2] ),
			parseFloat( args[3] )
		);
		this.currMatrix.multiply(m);
	},
	rwx_rotate: function(args) {
		// Build transform matrix from input
		var
			m = new THREE.Matrix4();
			mx = new THREE.Matrix4(),
			my = new THREE.Matrix4(),
			mz = new THREE.Matrix4();
			x = parseInt( args[1] ) == 1,
			y = parseInt( args[2] ) == 1,
			z = parseInt( args[3] ) == 1,
			angle = THREE.Math.degToRad( parseInt( args[4] ) );
		if ( x ) mx.makeRotationX( angle );
		if ( y ) my.makeRotationY( angle );
		if ( z ) mz.makeRotationY( angle );
		m.multiplyMatrices(mx, my);
		m.multiply(mz);

		// Apply outcome to current matrix
		this.currMatrix.multiply(m);
	},
	rwx_transform: function(args) {
		this.currMatrix.set(
			parseFloat( args[1] ),
			parseFloat( args[2] ),
			parseFloat( args[3] ),
			parseFloat( args[4] ),
			parseFloat( args[5] ),
			parseFloat( args[6] ),
			parseFloat( args[7] ),
			parseFloat( args[8] ),
			parseFloat( args[9] ),
			parseFloat( args[10] ),
			parseFloat( args[11] ),
			parseFloat( args[12] ),
			parseFloat( args[13] ),
			parseFloat( args[14] ),
			parseFloat( args[15] ),
			parseFloat( args[16] )
		)
	},
	rwx_transformbegin: function(args) {
		this.transformStack.push( this.currMatrix.clone() );
	},
	rwx_transformend: function(args) {
		this.currMatrix.copy( this.transformStack.pop() );
	},

	// RWX: Joints (Avatars)
	rwx_identityjoint: function(args) {
	},
	rwx_jointtransformbegin: function(args) {
	},
	rwx_jointtransformend: function(args) {
	},
	rwx_addhint: function(args) {
	},

	// RWX: Misc.
	rwx_collision: function(args) {
	},
	rwx_axisalignment: function(args) {
	},
	rwx_tag: function(args) {
	},
}
