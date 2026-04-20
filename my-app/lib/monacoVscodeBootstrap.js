import { MonacoVscodeApiWrapper } from 'monaco-languageclient/vscodeApiWrapper';
import 'vscode/localExtensionHost';

let servicesReadyPromise;

export async function ensureMonacoVscodeServicesReady() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!servicesReadyPromise) {
    servicesReadyPromise = (async () => {
      const apiWrapper = new MonacoVscodeApiWrapper({
        $type: 'classic',
        viewsConfig: {
          $type: 'EditorService',
        },
      });

      await apiWrapper.start({
        caller: 'lspBridge',
      });
    })().catch((error) => {
      servicesReadyPromise = undefined;
      throw error;
    });
  }

  await servicesReadyPromise;
}