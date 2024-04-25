<script>
import { Object3D, MathUtils, MeshBasicMaterial, Mesh, BoxGeometry, MeshStandardMaterial, LoadingManager, TextureLoader, PointLight, Box3, Vector3} from 'three';
import {Camera, EffectComposer, InstancedMesh, PhongMaterial, Renderer, RenderPass, SphereGeometry, SpotLight, Scene, UnrealBloomPass, AmbientLight} from 'troisjs';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { useCoreStore } from '/src/stores/core'
import * as Utils from '/src/assets/js/utils.js'

export default {
    components: {
        Camera,
        EffectComposer,
        InstancedMesh,
        PhongMaterial,
        Renderer,
        RenderPass,
        SphereGeometry,
        SpotLight,
        Scene,
        AmbientLight,
    },
    data() {
        const coreStore = useCoreStore();
        const current3dObject = null
        const posting = false
        return {
            coreStore,
            current3dObject,
            posting,
        }
    },
    methods: {
        removeObject3D(object3D) {
            if (!(object3D instanceof Object3D)) return false;

            // for better memory management and performance
            if (object3D.geometry) object3D.geometry.dispose();

            if (object3D.material) {
                if (object3D.material instanceof Array) {
                    // for better memory management and performance
                    object3D.material.forEach(material => material.dispose());
                } else {
                    // for better memory management and performance
                    object3D.material.dispose();
                }
            }
            object3D.removeFromParent(); // the parent might be the scene or another Object3D, but it is sure to be removed this way
            return true;
        },
        getPiece(sourceObject) {            
            const scene = this.$refs.scene.scene;
            const camera = this.$refs.camera.camera;

            const object = new OBJLoader().parse( sourceObject );
            object.traverse( function ( child, index ) {
                if ( child.isMesh ) {
                    const color = Utils.hexToRgb("#646877")
                    child.material.color.r = color.r / 255
                    child.material.color.g = color.g / 255
                    child.material.color.b = color.b / 255
                    child.material.specular.r = 0.2
                    child.material.specular.g = 0.2
                    child.material.specular.b = 0.2
                }

            } );

            object.rotation.x = -Math.PI / 2
            object.rotation.y = 0
            object.rotation.z = 0

            scene.add( object );
            this.current3dObject = object
            if (this.coreStore.fullCoreModel) {
                this.fitCameraToCenteredObject(camera, object, 1, 1.5)
            }
            else {

                if (this.$userStore.globalCore['functionalDescription']['shape']['family'] == 't') {
                    this.fitCameraToCenteredObject(camera, object, 1, 1.5)
                }
                else {
                    this.fitCameraToCenteredObject(camera, object, 1, 3)
                }
            }
        },
        fitCameraToCenteredObject(camera, object, offset, offsetY, orbitControls) {
            const boundingBox = new Box3();
            boundingBox.setFromObject( object );

            var middle = new Vector3();
            var size = new Vector3();
            boundingBox.getSize(size);

            // figure out how to fit the box in the view:
            // 1. figure out horizontal FOV (on non-1.0 aspects)
            // 2. figure out distance from the object in X and Y planes
            // 3. select the max distance (to fit both sides in)
            //
            // The reason is as follows:
            //
            // Imagine a bounding box (BB) is centered at (0,0,0).
            // Camera has vertical FOV (camera.fov) and horizontal FOV
            // (camera.fov scaled by aspect, see fovh below)
            //
            // Therefore if you want to put the entire object into the field of view,
            // you have to compute the distance as: z/2 (half of Z size of the BB
            // protruding towards us) plus for both X and Y size of BB you have to
            // figure out the distance created by the appropriate FOV.
            //
            // The FOV is always a triangle:
            //
            //  (size/2)
            // +--------+
            // |       /
            // |      /
            // |     /
            // | F° /
            // |   /
            // |  /
            // | /
            // |/
            //
            // F° is half of respective FOV, so to compute the distance (the length
            // of the straight line) one has to: `size/2 / Math.tan(F)`.
            //
            // FTR, from https://threejs.org/docs/#api/en/cameras/PerspectiveCamera
            // the camera.fov is the vertical FOV.

            const fov = camera.fov * ( Math.PI / 180 );
            const fovh = 2*Math.atan(Math.tan(fov/2) * camera.aspect);
            let dx = size.z / 2 + Math.abs( size.x / 2 / Math.tan( fovh / 2 ) );
            let dy = size.z / 2 + Math.abs( size.y / 2 / Math.tan( fov / 2 ) );
            let cameraZ = Math.max(dx, dy);
            let cameraY = size.y;

            // offset the camera, if desired (to avoid filling the whole canvas)
            if( offset !== undefined && offset !== 0 ) cameraZ *= offset;
            if( offsetY !== undefined && offsetY !== 0 ) cameraY *= offsetY;

            camera.position.set( 0, cameraY, cameraZ );

            // set the far plane of the camera so that it easily encompasses the whole object
            const minZ = boundingBox.min.z;
            const cameraToFarEdge = ( minZ < 0 ) ? -minZ + cameraZ : cameraZ - minZ;

            camera.far = cameraToFarEdge * 30;
            camera.updateProjectionMatrix();

            if ( orbitControls !== undefined ) {
                // set camera to rotate around the center
                orbitControls.target = new THREE.Vector3(0, 0, 0);

                // prevent camera from zooming out far enough to create far plane cutoff
                orbitControls.maxDistance = cameraToFarEdge * 20;
            }
        }

    },
    mounted() {
        // init instanced mesh matrix

        this.coreStore.$onAction((action) => {
            if (action.name == "setStreamedObj") {
                this.posting = false
                var sourceObject = action.args[0]
                this.getPiece(sourceObject)
            }
            else if (action.name == "requestingNewShape") {
                this.removeObject3D(this.current3dObject)
                this.posting = true
            }
        })



    },
};
</script>

<template>
    <img data-cy="CoreShapeArtisanVisualizer-loading" v-if="posting" class="mx-auto d-block col-12" alt="loading" style="width: 60%; height: auto;" src="/images/loading.gif">
    <Renderer data-cy="CoreShapeArtisanVisualizer-canvas" ref="renderer" resize=true :orbit-ctrl="{ enableDamping: true, dampingFactor: 0.05, autoRotate : true }" shadow>
        <Camera ref="camera" />
        <Scene ref="scene" :background="'#1a1a1a'">
            <SpotLight color="#539796" :intensity="1" :position="{ y: 150, z: 100 }" :cast-shadow="true" :shadow-map-size="{ width: 1024, height: 1024 }" />
            <SpotLight color="#539796" :intensity="1" :position="{ y: -150, z: 100 }" :cast-shadow="true" :shadow-map-size="{ width: 1024, height: 1024 }" />
            <SpotLight color="#539796" :intensity="1" :position="{ x: 150, z: 100 }" :cast-shadow="true" :shadow-map-size="{ width: 1024, height: 1024 }" />
            <SpotLight color="#539796" :intensity="1" :position="{ x: -150, z: 100 }" :cast-shadow="true" :shadow-map-size="{ width: 1024, height: 1024 }" />
        </Scene>
    </Renderer>
</template>
