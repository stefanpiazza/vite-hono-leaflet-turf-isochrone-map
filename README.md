# vite-hono-leaflet-turf-isochrone-map

A full-stack application with Vite + React frontend and Hono backend for creating isochrone maps using Leaflet and Turf.js.

## Installation

Install dependencies for both client and server:

```bash
# Install root dependencies
bun install

# Install client dependencies
cd client
bun install
```

## Development

### Run the Server

From the root directory:

```bash
bun run dev
```

Or to start the server without watch mode:

```bash
bun run start
```

The server will run on the default Hono port.

### Run the Client

From the client directory:

```bash
cd client
bun run dev
```

The client will typically run on `http://localhost:5173`.

## Building for Production

Build the client:

```bash
cd client
bun run build
```

Preview the production build:

```bash
cd client
bun run preview
```
