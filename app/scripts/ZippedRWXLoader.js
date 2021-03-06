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

			scope.parse( onLoad, onError, texturePath, buffer );

		}, onProgress, onError );

	},

	parse: function ( onLoad, onError, texturePath, buffer_ ) {
		var buffer = new Uint8Array(buffer_);
		if (String.fromCharCode(buffer[0]) == 'P' &&
			String.fromCharCode(buffer[1]) == 'K') {

			var fnameLength = buffer[26] | (buffer[27] << 8);
			var extraLength = buffer[28] | (buffer[29] << 8);
			var fname = '';

			for (var i = 0; i < fnameLength; i++)
				fname += String.fromCharCode( buffer[30 + i] );

			var newBuf = new Uint8Array( buffer_.slice( 30 + fnameLength + extraLength ) );
			var output = null;

			try {
				output = pako.inflateRaw(newBuf, { to: 'string' });
			} catch(e) {
				console.warn(fname + ': inflate error ', e);
				onError();
				return null;
			}

			this.parser.texturePath = texturePath;
			return onLoad( this.parser.parse(fname, output) );
		} else {
			console.error(fname + ': Not a ZIP file');
		}

		onError();

		return null;
	}
};
