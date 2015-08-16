# ThreeJS based OpenWorlds client

This repository contains the experimental OpenWorlds client code. Currently it is not much
more then an RWX model viewer, but as soon as the RWX support is at a decent level it will
get its world property data from the OpenWorlds REST API, and build the whole scene.

## TODO:

* Finish RWXLoader to an acceptable level.
* Implement avatar loading and animation (nested RWX clumps).
* Use OpenWorlds REST API to get world property
* Implement world attribute configuration in OpenWorlds Server and use it here.
