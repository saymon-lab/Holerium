import { useState, useCallback } from 'react';

const CLIENT_ID = "166814312947-qb8qvpovsjfe9aej3acu5qpcgvk1gfbf.apps.googleusercontent.com";
const API_KEY = "AIzaSyA938HDdzLkTJKJSULkIb3Z1fcgYz_EcYM"; 
const SCOPES = "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly";

export function useGoogleDrive() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(false);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);

  // Inicializa o GAPI e o GIS (Google Identity Services)
  const initScripts = useCallback(() => {
    const gapi = (window as any).gapi;
    const google = (window as any).google;

    if (gapi) {
      gapi.load('client:picker', () => {
        setIsGapiLoaded(true);
        gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
        }).then(() => setIsPickerApiLoaded(true));
      });
    }
  }, []);

  // Solicita autorização e retorna o token
  const authenticate = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      if (!google) return reject("Google Identity Services não carregado");

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) return reject(response.error);
          setAccessToken(response.access_token);
          resolve(response.access_token);
        },
      });

      tokenClient.requestAccessToken();
    });
  };

  // Abre o seletor de pastas/arquivos
  const showPicker = (token: string): Promise<any[]> => {
    return new Promise((resolve) => {
      const google = (window as any).google;
      
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setSelectFolderEnabled(true)
        .setIncludeFolders(true);

      const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setAppId(CLIENT_ID.split('-')[0])
        .setDeveloperKey(API_KEY)
        .setOAuthToken(token)
        .addView(view)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            resolve(data.docs);
          }
        })
        .build();

      picker.setVisible(true);
    });
  };

  // Lista arquivos dentro de uma pasta
  const listFiles = async (folderId: string, token: string) => {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/pdf'&fields=files(id,name,mimeType)&key=${API_KEY}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await response.json();
    return data.files || [];
  };

  // Baixa o conteúdo de um arquivo
  const downloadFile = async (fileId: string, token: string): Promise<Blob> => {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return await response.blob();
  };

  return {
    initScripts,
    authenticate,
    showPicker,
    listFiles,
    downloadFile,
    isReady: isPickerApiLoaded && isGapiLoaded
  };
}
