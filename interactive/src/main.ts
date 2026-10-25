import "@lernapps/app-templates/interactive/style.css";
import { startInteractive } from "@lernapps/app-templates/interactive";
import * as core from "./core/index.ts";
import App from "./ui/App.vue";

startInteractive(core, App);
