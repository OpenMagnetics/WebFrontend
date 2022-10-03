import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'
import './styles/css/custom.css'
// import './styles/css/custom.css.map'
import 'bootstrap';
// import 'bootstrap/dist/css/bootstrap.min.css';
import router from "./router";

const app = createApp(App);
app.use(router);
app.mount("#app");
