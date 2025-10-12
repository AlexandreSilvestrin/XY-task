try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    import os
    import subprocess
    import sys
    import json
    import glob
    import signal
    import threading
    import time
    from datetime import datetime

    # Adicionar o diretório atual ao sys.path para importar módulos locais
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    from func.balancete import processar_balancete

except ImportError as e:
    print("\n" + "="*60)
    print("❌ ERRO: Biblioteca não encontrada!")
    print("="*60)
    print(f"Erro: {e}")
    print("\nPara resolver, instale as dependências com:")
    print("pip install -r requirements.txt")
    print("="*60)
    sys.exit(1)

app = Flask(__name__)
CORS(app)

# Configurações
PORT = 5000
DEBUG = True

# Variável para controlar o servidor
server_shutdown = False

def signal_handler(signum, frame):
    """Handler para sinais de finalização"""
    global server_shutdown
    print(f"\nRecebido sinal {signum}. Finalizando servidor...")
    server_shutdown = True
    sys.exit(0)

def graceful_shutdown():
    """Finalização graciosa do servidor"""
    global server_shutdown
    print("Iniciando finalizacao graciosa do servidor...")
    server_shutdown = True
    time.sleep(1)  # Dar tempo para requisições pendentes
    os._exit(0)

# Configurar handlers de sinais
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

@app.route('/health', methods=['GET'])
def health_check():
    """Verifica se o servidor está funcionando"""
    if server_shutdown:
        return jsonify({
            'status': 'shutting_down',
            'message': 'Servidor sendo finalizado',
            'timestamp': datetime.now().isoformat()
        }), 503
    
    return jsonify({
        'status': 'ok',
        'message': 'Servidor Python funcionando',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/shutdown', methods=['POST'])
def shutdown():
    """Finaliza o servidor graciosamente"""
    print("Recebida requisicao de shutdown via HTTP")
    threading.Thread(target=graceful_shutdown).start()
    return jsonify({
        'status': 'shutting_down',
        'message': 'Servidor sendo finalizado',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/process-file', methods=['POST'])
def process_file():
    """Processa arquivo(s) de balancete selecionado(s)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Dados não fornecidos'
            }), 400
        
        input_path = data.get('inputPath')
        output_folder = data.get('outputFolder')
        operation = data.get('operation', 'balancete')
        
        # Validar caminhos
        if not input_path or not output_folder:
            return jsonify({
                'success': False,
                'message': 'Caminho do arquivo/pasta e pasta de saída são obrigatórios'
            }), 400
        
        # Verificar se o caminho de entrada existe
        if not os.path.exists(input_path):
            return jsonify({
                'success': False,
                'message': f'Caminho não encontrado: {input_path}'
            }), 400
        
        # Verificar se a pasta de saída existe
        if not os.path.exists(output_folder):
            return jsonify({
                'success': False,
                'message': f'Pasta de saída não encontrada: {output_folder}'
            }), 400
        
        # Processar arquivo(s) usando balancete.py
        result = process_balancete_files(input_path, output_folder)
        
        return jsonify({
            'success': True,
            'message': f'{result["processed_count"]} arquivo(s) processado(s) com sucesso!',
            'result': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao processar arquivo(s): {str(e)}'
        }), 500

def process_balancete_files(input_path, output_folder):
    """
    Processa arquivo(s) de balancete usando balancete.py
    Suporta tanto arquivo único quanto pasta com múltiplos arquivos
    """
    try:
        processed_files = []
        errors = []
        
        # Determinar se é arquivo único ou pasta
        if os.path.isfile(input_path):
            # Arquivo único
            if input_path.lower().endswith('.txt'):
                try:
                    output_file = processar_balancete(input_path, output_folder)
                    processed_files.append({
                        'inputFile': input_path,
                        'outputFile': output_file,
                        'fileSize': os.path.getsize(input_path),
                        'status': 'success'
                    })
                except Exception as e:
                    errors.append(f"Erro ao processar {os.path.basename(input_path)}: {str(e)}")
            else:
                errors.append(f"Arquivo {os.path.basename(input_path)} não é um arquivo .txt")
        
        elif os.path.isdir(input_path):
            # Pasta com múltiplos arquivos
            txt_files = glob.glob(os.path.join(input_path, "*.txt"))
            
            if not txt_files:
                raise Exception("Nenhum arquivo .txt encontrado na pasta selecionada")
            
            for txt_file in txt_files:
                try:
                    output_file = processar_balancete(txt_file, output_folder)
                    processed_files.append({
                        'inputFile': txt_file,
                        'outputFile': output_file,
                        'fileSize': os.path.getsize(txt_file),
                        'status': 'success'
                    })
                except Exception as e:
                    errors.append(f"Erro ao processar {os.path.basename(txt_file)}: {str(e)}")
        
        else:
            raise Exception("Caminho fornecido não é um arquivo nem uma pasta válida")
        
        return {
            'processed_count': len(processed_files),
            'processed_files': processed_files,
            'errors': errors,
            'inputPath': input_path,
            'outputFolder': output_folder,
            'processedAt': datetime.now().isoformat()
        }
        
    except Exception as e:
        raise Exception(f"Erro na lógica de processamento: {str(e)}")

@app.route('/get-file-info', methods=['POST'])
def get_file_info():
    """Retorna informações sobre um arquivo"""
    try:
        data = request.get_json()
        file_path = data.get('filePath')
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'message': 'Arquivo não encontrado'
            }), 400
        
        file_info = {
            'name': os.path.basename(file_path),
            'path': file_path,
            'size': os.path.getsize(file_path),
            'extension': os.path.splitext(file_path)[1],
            'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
        }
        
        return jsonify({
            'success': True,
            'fileInfo': file_info
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erro ao obter informações do arquivo: {str(e)}'
        }), 500

if __name__ == '__main__':
    print(f"Iniciando servidor Flask na porta {PORT}")
    print(f"Diretorio atual: {os.getcwd()}")
    print(f"Python version: {sys.version}")
    print(f"Handlers de sinal configurados: SIGTERM, SIGINT")
    
    try:
        # Usar servidor Flask padrão com debug desabilitado para produção
        app.run(host='127.0.0.1', port=PORT, debug=False, threaded=True)
        
    except KeyboardInterrupt:
        print("\nInterrupcao por teclado detectada")
    except Exception as e:
        print(f"Erro no servidor: {e}")
    finally:
        print("Finalizando servidor Flask...")
        server_shutdown = True
