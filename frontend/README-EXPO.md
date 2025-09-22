# SafeRide Mobile (Expo + React Navigation)

## 🚗 Sobre o Projeto

SafeRide é um aplicativo móvel de segurança para motoristas, desenvolvido com **Expo + React Native** e **React Navigation**, pronto para publicação nas lojas de aplicativos.

### ✨ Funcionalidades Principais

- 🚨 **Sistema de Emergência**: Botão de emergência com compartilhamento de localização
- 📱 **Alertas WhatsApp**: Notificações automáticas para contatos de emergência
- 🗺️ **Mapa Interativo**: Visualização de emergências próximas (em desenvolvimento)
- 💬 **Chat de Motoristas**: Comunicação entre motoristas próximos (em desenvolvimento)
- ⚙️ **Configurações**: Gerenciamento de perfil e contatos de emergência
- 🔐 **Autenticação Segura**: Login e registro com JWT

### 🏗️ Arquitetura

- **Frontend**: Expo + React Native + React Navigation
- **Backend**: FastAPI + Python + MongoDB
- **Navegação**: React Navigation (Stack + Bottom Tabs)
- **Estado**: Context API para autenticação
- **UI**: Design system nativo com tema dark

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Expo CLI
- EAS CLI (opcional, para builds)

### Instalação

1. **Clone e instale dependências**:
```bash
cd /app/frontend
npm install
```

2. **Inicie o servidor de desenvolvimento**:
```bash
npm start
# ou
expo start
```

3. **Execute em diferentes plataformas**:
```bash
npm run android    # Android emulator/device
npm run ios        # iOS simulator
npm run web        # Navegador web
```

## 📱 Testando no Dispositivo

### Expo Go (Desenvolvimento)
1. Instale o Expo Go no seu dispositivo
2. Execute `npm start`
3. Escaneie o QR code que aparece no terminal

### Build Nativo (Produção)
```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Fazer login no Expo
eas login

# Build para Android (Play Store)
eas build -p android --profile production

# Build para iOS (App Store)
eas build -p ios --profile production
```

## 📦 Deploy

### Android (Google Play Store)
```bash
# Gera o .aab para upload na Play Store
eas build -p android --profile production

# Após o build, baixe o arquivo .aab
# Faça upload no Google Play Console
```

### iOS (App Store)
```bash
# Gera o build para App Store
eas build -p ios --profile production

# Use o Xcode ou EAS Submit para enviar para App Store
eas submit -p ios
```

## 🗂️ Estrutura do Projeto

```
frontend/
├── App.tsx                 # Componente principal com navegação
├── src/
│   ├── navigation/         # Configuração de navegação
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── screens/           # Telas do aplicativo
│   │   ├── HomeScreen.tsx
│   │   ├── EmergencyScreen.tsx
│   │   ├── MapScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── AuthScreen.tsx
│   │   └── ForgotPasswordScreen.tsx
│   └── components/        # Componentes reutilizáveis
│       └── Header.tsx
├── contexts/              # Context API
│   └── AuthContext.tsx
├── assets/               # Imagens e ícones
├── app.json             # Configuração do Expo
├── eas.json             # Configuração EAS Build
└── package.json         # Dependências
```

## 🎨 Design System

### Cores Principais
- **Background**: `#1a1a1a` (Dark)
- **Cards**: `#333` (Dark Gray)
- **Primary**: `#FF3B30` (Emergency Red)
- **Success**: `#28A745` (Green)
- **Info**: `#007BFF` (Blue)
- **Warning**: `#FF9800` (Orange)

### Componentes
- **SafeAreaView**: Usado em todas as telas
- **Header**: Componente consistente com logo
- **TouchableOpacity**: Para todos os botões
- **Haptic Feedback**: Feedback tátil em interações

## 🔧 Configurações de Desenvolvimento

### Environment Variables
Crie um arquivo `.env` na raiz:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

### Metro Config
O projeto usa Metro bundler com configurações otimizadas para performance.

### TypeScript
Projeto totalmente tipado com TypeScript para maior segurança e produtividade.

## 📋 To-Do List

### ✅ Implementado
- [x] Sistema de autenticação completo
- [x] Navegação com React Navigation
- [x] Tela de emergência funcional
- [x] Design system nativo
- [x] Integração com backend FastAPI
- [x] Context API para estado global

### 🚧 Em Desenvolvimento
- [ ] Mapa interativo com emergências
- [ ] Chat em tempo real
- [ ] Notificações push
- [ ] Modo offline
- [ ] Testes automatizados

### 📈 Futuras Melhorias
- [ ] Integração com Waze/Google Maps
- [ ] Sistema de avaliações
- [ ] Gamificação
- [ ] Suporte a múltiplos idiomas

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📞 Contato e Suporte

Para dúvidas ou suporte técnico, abra uma issue no GitHub ou entre em contato através dos canais oficiais.

---

**SafeRide** - Segurança para motoristas 🚗✨