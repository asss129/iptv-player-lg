# IPTV Player — versión LG webOS

Este proyecto contiene la aplicación web preparada para empaquetarse como una app `.ipk` de LG webOS.

## Importante antes de empezar

El `.ipk` contiene la interfaz que se instala en el televisor. El pequeño servidor Node incluido en `server/` hace de intermediario con Xtream Codes y **no se ejecuta dentro del `.ipk`**. Para que el reproductor funcione en la TV, ese servidor debe estar publicado en un alojamiento HTTPS y hay que configurar su dirección al compilar.

No introduzcas aquí ni compartas tus credenciales IPTV. Usa solo un servicio al que tengas derecho de acceso.

## Crear el IPK en Windows (resumen)

1. Instala Node.js LTS desde https://nodejs.org/ y reinicia el ordenador.
2. Instala webOS CLI desde una terminal (PowerShell o CMD):

   ```bash
   npm install -g @webos-tools/cli
   ```

3. Descomprime esta carpeta en una ubicación sencilla, por ejemplo `C:\IPTV-LG`.
4. Abre PowerShell dentro de esa carpeta. En el Explorador de archivos, entra en la carpeta `iptv-player-solo-lg`, haz clic en la barra de dirección, escribe `powershell` y pulsa Enter.
5. Instala las dependencias:

   ```bash
   npm install
   ```

6. Cuando tengas publicada la API del proyecto `server/`, compila indicando su dirección pública HTTPS (sustituye la URL de ejemplo por la tuya):

   ```powershell
   $env:VITE_API_URL="https://TU-DOMINIO/api/xtream"
   npm run build:webos
   ares-package webos
   ```

7. El archivo `.ipk` se creará en esta misma carpeta. Su nombre será parecido a `com.iptvplayer.webos_1.0.0_all.ipk`.

Si todavía no tienes un alojamiento para el servidor, puedes compilar el paquete, pero el inicio de sesión y la carga de canales no funcionarán hasta publicar `server/` y volver a compilar con su URL.

## Instalar en el televisor

Para instalarlo directamente en la LG necesitas un ordenador conectado a la misma red que la TV:

1. En la TV abre LG Content Store / Apps, busca e instala **Developer Mode**.
2. Inicia Developer Mode, inicia sesión con tu cuenta LG Developer y activa **Dev Mode Status**. La TV se reiniciará.
3. Vuelve a abrir Developer Mode y anota la dirección IP y el passphrase/clave que muestra la aplicación.
4. En PowerShell, registra el televisor con:

   ```bash
   ares-setup-device
   ```

   Elige `add` y completa los datos solicitados usando la IP, el puerto y el usuario/clave que muestra Developer Mode. Nombra el dispositivo `miTV`.

5. Instala el paquete (sustituye el nombre por el archivo real):

   ```bash
   ares-install --device miTV .\com.iptvplayer.webos_1.0.0_all.ipk
   ```

6. Abre la app:

   ```bash
   ares-launch --device miTV com.iptvplayer.webos
   ```

La sesión de Developer Mode es temporal y debe mantenerse activa para pruebas. Consulta la guía oficial de LG para los pasos exactos de conexión.
