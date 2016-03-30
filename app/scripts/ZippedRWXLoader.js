ZippedRWXLoader = function( manager ) {
	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
}

ZippedRWXLoader.prototype = {
	constructor: ZippedRWXLoader,

	parser: new THREE.RWXLoader,

	load: function ( url, onLoad, onProgress, onError, texturePath ) {

		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		loader.setCrossOrigin( this.crossOrigin );
		loader.setResponseType( 'arraybuffer' );
		loader.load( url, function ( buffer ) {

			onLoad( scope.parse( texturePath, buffer ) );

		}, onProgress, onError );

	},

	parse: function ( texturePath, buffer_ ) {
		var buffer = new Uint8Array(buffer_);
		if (String.fromCharCode(buffer[0]) == 'P' &&
			String.fromCharCode(buffer[1]) == 'K') {

			var fnameLength = buffer[26] | (buffer[27] << 8) | (buffer[28] << 16) | (buffer[29] << 24);
			var fname = '';

			for (var i = 0; i < fnameLength; i++)
				fname += String.fromCharCode( buffer[30 + i] );

			var newBuf = new Uint8Array( buffer_.slice( 30 + fnameLength ) );
			var output = pako.inflateRaw(newBuf, { to: 'string' });
			this.parser.texturePath = texturePath;
			return this.parser.parse(fname, output);
		}

		return null;
	}
};