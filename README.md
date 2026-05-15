# TensorFlow

Este proyecto consiste en el desarrollo de una aplicación capaz de reconocer los gestos del juego piedra, papel o tijera mediante inteligencia artificial y visión por computadora.

El sistema permite al usuario subir una imagen o utilizar la cámara web para capturar una foto en tiempo real. A partir de ello, el modelo analiza la posición de la mano y determina si el gesto corresponde a piedra, papel o tijera, basándose en el entrenamiento previamente realizado.

## Descripción del proyecto

La aplicación fue desarrollada con el objetivo de aplicar conceptos de inteligencia artificial, procesamiento de imágenes y reconocimiento de patrones utilizando tecnologías web.

Para el reconocimiento de las manos se implementó MediaPipe Hands, herramienta que permite detectar puntos clave de la mano para posteriormente interpretar el gesto realizado por el usuario.

## Funcionalidades

- Carga de imágenes desde el dispositivo.
- Captura de imágenes mediante cámara web.
- Detección de mano en tiempo real.
- Clasificación automática de gestos.
- Interfaz interactiva y fácil de usar.
- Procesamiento rápido de imágenes.

## Tecnologías utilizadas

- HTML
- CSS
- JavaScript
- MediaPipe Hands
- Vision Tasks

## Funcionamiento

1. El usuario selecciona una imagen o activa la cámara.
2. El sistema detecta la mano dentro de la imagen.
3. Se analizan los puntos clave de la mano.
4. El modelo compara la información con los datos obtenidos durante el entrenamiento.
5. Finalmente se muestra el resultado correspondiente al gesto detectado.

## Objetivo

El objetivo principal del proyecto es demostrar cómo un modelo entrenado puede identificar patrones visuales y clasificarlos correctamente a partir de imágenes capturadas en tiempo real o cargadas por el usuario.

## Cómo ejecutar el proyecto

1. Descargar o clonar el repositorio.
2. Abrir el archivo `index.html` en el navegador.
3. Permitir acceso a la cámara si se desea utilizar la captura en vivo.
4. Subir una imagen o tomar una foto para realizar la predicción.

## Aprendizajes obtenidos

Durante el desarrollo del proyecto se fortalecieron conocimientos relacionados con:

- Inteligencia artificial aplicada a imágenes.
- Visión por computadora.
- Procesamiento de imágenes en JavaScript.
- Detección de landmarks de mano.
- Integración de herramientas de reconocimiento en aplicaciones web.
