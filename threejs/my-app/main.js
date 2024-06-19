import './style.css'

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.set(0, 50, 0);  // Positionner la caméra au-dessus
camera.lookAt(0, 0, 0);         // Faire regarder la caméra vers le centre

// Matériau pour le terrain (couleur unie)
const terrainMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 }); // Vert

// Terrain (64 x 32)
const terrainGeometry = new THREE.PlaneGeometry(64, 32);
const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.rotation.x = -Math.PI / 2; // Mettre à plat sur l'axe X
scene.add(terrain);

// Matériau pour la balle (wireframe)
const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }); // Rouge

// Balle au centre
const ballGeometry = new THREE.SphereGeometry(1, 32, 32);
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.set(0, 1, 0); // Positionner la balle légèrement au-dessus du terrain
scene.add(ball);

// Matériau pour les lignes (blanc uni)
const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

// Ligne centrale
const centerLineGeometry = new THREE.PlaneGeometry(0.5, 32); // Largeur de la ligne de 0.5 unités, hauteur de 32 unités
const centerLine = new THREE.Mesh(centerLineGeometry, lineMaterial);
centerLine.rotation.x = -Math.PI / 2; // Mettre à plat sur l'axe X
centerLine.position.set(0, 0.1, 0); // Légèrement au-dessus du terrain pour éviter les conflits de rendu
scene.add(centerLine);

// Bordures du terrain
const borderThickness = 0.5; // Épaisseur des bordures

// Bordure supérieure
const topBorderGeometry = new THREE.PlaneGeometry(64.5, borderThickness);
const topBorder = new THREE.Mesh(topBorderGeometry, lineMaterial);
topBorder.rotation.x = -Math.PI / 2;
topBorder.position.set(0, 0.1, -16); // Positionné au bord supérieur
scene.add(topBorder);

// Bordure inférieure
const bottomBorderGeometry = new THREE.PlaneGeometry(64.5, borderThickness);
const bottomBorder = new THREE.Mesh(bottomBorderGeometry, lineMaterial);
bottomBorder.rotation.x = -Math.PI / 2;
bottomBorder.position.set(0, 0.1, 16); // Positionné au bord inférieur
scene.add(bottomBorder);

// Bordure gauche
const leftBorderGeometry = new THREE.PlaneGeometry(borderThickness, 32);
const leftBorder = new THREE.Mesh(leftBorderGeometry, lineMaterial);
leftBorder.rotation.x = -Math.PI / 2;
leftBorder.position.set(-32, 0.1, 0); // Positionné au bord gauche
scene.add(leftBorder);

// Bordure droite
const rightBorderGeometry = new THREE.PlaneGeometry(borderThickness, 32);
const rightBorder = new THREE.Mesh(rightBorderGeometry, lineMaterial);
rightBorder.rotation.x = -Math.PI / 2;
rightBorder.position.set(32, 0.1, 0); // Positionné au bord droit
scene.add(rightBorder);

// Matériau pour les padels
const paddleMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Bleu

// Padel gauche
const paddleLeftGeometry = new THREE.BoxGeometry(1, 7, 1);
const paddleLeft = new THREE.Mesh(paddleLeftGeometry, paddleMaterial);
paddleLeft.position.set(-30, 1, 0); // Positionné à gauche et à la même hauteur que la balle
paddleLeft.rotation.x = Math.PI / 2; // Faire pivoter de 90 degrés
scene.add(paddleLeft);

// Padel droit
const paddleRightGeometry = new THREE.BoxGeometry(1, 7, 1);
const paddleRight = new THREE.Mesh(paddleRightGeometry, paddleMaterial);
paddleRight.position.set(30, 1, 0); // Positionné à droite et à la même hauteur que la balle
paddleRight.rotation.x = Math.PI / 2; // Faire pivoter de 90 degrés
scene.add(paddleRight);

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(0, 50, 50);

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(pointLight, ambientLight);

const lightHelper = new THREE.PointLightHelper(pointLight);
const gridHelper = new THREE.GridHelper(64, 32);
scene.add(gridHelper);

const controls = new OrbitControls(camera, renderer.domElement);

function animate() {
  requestAnimationFrame(animate);

  controls.update();
  renderer.render(scene, camera);
}

animate();
