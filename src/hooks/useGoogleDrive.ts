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
    console.log("Iniciando scripts do Google...");
    
    const checkScripts = setInterval(() => {
      const gapi = (window as any).gapi;
      const google = (window as any).google;

      if (gapi && google) {
        clearInterval(checkScripts);
        console.log("Scripts do Google detectados. Carregando Picker...");
        
        gapi.load('client:picker', {
          callback: () => {
            setIsGapiLoaded(true);
            gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            }).then(() => {
              console.log("GAPI Client e Picker OK.");
              setIsPickerApiLoaded(true);
            }).catch((err: any) => {
              console.error("Erro no GAPI Init:", err);
            });
          },
          onerror: () => console.error("Erro ao carregar Picker API")
        });
      }
    }, 500);

    // Timeout de 10 segundos
    setTimeout(() => clearInterval(checkScripts), 10000);
  }, []);

  // Solicita autorização e retorna o token
  const authenticate = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      if (!google || !google.accounts) {
        return reject("Bibliotecas do Google não carregadas. Tente atualizar a página (F5).");
      }

      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) {
              console.error("Erro OAuth:", response.error);
              return reject(response.error);
            }
            console.log("OAuth Token recebido.");
            setAccessToken(response.access_token);
            resolve(response.access_token);
          },
        });

        tokenClient.requestAccessToken();
      } catch (err) {
        console.error("Erro ao iniciar Token Client:", err);
        reject(err);
      }
    });
  };

  // Abre o seletor de pastas/arquivos
  const showPicker = (token: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      if (!google || !google.picker) {
        return reject("API de Seleção (Picker) não carregada.");
      }
      
      try {
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
            } else if (data.action === google.picker.Action.CANCEL) {
              resolve([]);
            }
          })
          .build();

        picker.setVisible(true);
      } catch (err) {
        console.error("Erro ao abrir Picker:", err);
        reject(err);
      }
    });
  };

  // Lista arquivos dentro de uma pasta
  const listFiles = async (folderId: string, token: string) => {
    try {
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
    } catch (err) {
      console.error("Erro ao listar arquivos do Drive:", err);
      return [];
    }
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
    if (!response.ok) throw new Error(`Falha no download: ${response.statusText}`);
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
