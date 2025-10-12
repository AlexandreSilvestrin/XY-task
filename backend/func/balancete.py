
import pandas as pd
import os
import re
from decimal import Decimal
import xlsxwriter

def processar_balancete(arquivo_path, pasta_destino=None):
    """Processa um arquivo de balancete e retorna o caminho do arquivo Excel gerado"""
    try:
        with open(arquivo_path, "r", encoding="utf-8") as f:
            conteudo = f.read()

        padrao = r'Balancete Analitico.*?ATUAL'
        cabecalho = re.search(padrao, conteudo, flags=re.S)
        if cabecalho:
            cabecalho = cabecalho.group().split('\n')

        texto_limpo = re.sub(padrao, '', conteudo, flags=re.S)
        texto_limpo = re.sub(r' -----------------------------------------------------------------------------------------------------------------------------------', '', texto_limpo, flags=re.S)
        
        lista = texto_limpo.split('\n')
        lista = [i for i in lista if len(i) >= 80]
        lista = [item for item in lista if "Folha:" not in item and "Data:" not in item and 'Mes/Ano:' not in item]

        nova_lista = []
        for item in lista:
            if "TOTAL DO ATIVO" in item.upper():
                break
            nova_lista.append(item)

        def formatar_valor(valor):
            valor = valor.strip()
            try:
                num_str, tipo = valor.split()
            except:
                tipo = ''
                num_str = valor
            num = Decimal(num_str.replace('.', '').replace(',', '.'))
            if tipo.upper() == 'C':
                num = -num
            return num

        def dividir_linha(linha):
            partes = [p.strip() for p in linha.split('-') if p.strip()]
            if len(partes) == 2:
                conta, descricao = partes
            elif len(partes) > 2:
                conta = partes[0]
                descricao = ' - '.join(partes[1:])
            else:
                conta = partes[0] if partes else ''
                descricao = ''
            if '(' in conta:
                conta = conta.replace('(', '').replace(')', '')
                conta = str(int(conta))
            return conta, descricao

        def ler_cabecalho(cabecalho):
            mes_ano = data = consorcio = cnpj = ""
            for linha in cabecalho:
                linha = linha.strip()
                if "Mes/Ano:" in linha:
                    mes_ano = linha.split("Mes/Ano:")[1].strip()
                if "Data:" in linha:
                    partes = linha.split("Data:")
                    consorcio = partes[0].strip()
                    data = partes[1].strip()
                if "CNPJ:" in linha:
                    cnpj = linha.split("CNPJ:")[1].split()[0].strip()
            return mes_ano, data, consorcio, cnpj

        df = pd.DataFrame()
        for linha in nova_lista:
            valores = linha[-74:]
            saldo_atual = formatar_valor(valores[-19:])
            credito = formatar_valor(valores[-36:-19])
            debito = formatar_valor(valores[-55:-36])
            salto_anteriror = formatar_valor(valores[:-55])
            conta, descricao = dividir_linha(linha[:-74])
            nova_linha = {'Conta': conta, 'Descricao': descricao, 'Saldo Anterior': salto_anteriror, 'Débito': debito, 'Crédito': credito, 'Saldo Atual': saldo_atual}
            linha_df = pd.DataFrame([nova_linha])
            df = pd.concat([df, linha_df], ignore_index=True)

        mes_ano, data, consorcio, cnpj = ler_cabecalho(cabecalho)
        arquivo = f'{consorcio}_{data}_BALANCETE.xlsx'.replace(r"/", "-")
        
        # Se pasta_destino foi especificada, salva lá
        if pasta_destino:
            arquivo = os.path.join(pasta_destino, arquivo)

        with pd.ExcelWriter(arquivo, engine='xlsxwriter') as writer:
            workbook = writer.book
            sheet_name = 'Balancete'
            worksheet = workbook.add_worksheet(sheet_name)
            worksheet.write('A1', 'Balancete Analítico')
            worksheet.write('A2', consorcio)
            worksheet.write('A3', f'CNPJ:{cnpj}')
            worksheet.write('E1', 'Folha:')
            worksheet.write('F1', '000001')
            worksheet.write('E2', 'Data:')
            worksheet.write('F2', data)
            worksheet.write('E3', 'Mes/Ano:')
            worksheet.write('F3', mes_ano)

            # Formato brasileiro para valores numéricos (separador de milhares + 2 casas decimais)
            formato_valor = workbook.add_format({'num_format': '#,##0.00'})
            formato_texto = workbook.add_format()
            
            # Configurar larguras das colunas
            worksheet.set_column('A:A', 15, formato_texto)  # Conta
            worksheet.set_column('B:B', 60, formato_texto)  # Descrição
            worksheet.set_column('C:C', 20, formato_valor)   # Saldo Anterior
            worksheet.set_column('D:D', 20, formato_valor)  # Débito
            worksheet.set_column('E:E', 20, formato_valor)   # Crédito
            worksheet.set_column('F:F', 20, formato_valor)  # Saldo Atual
            
            # Escrever o DataFrame com formatação
            df.to_excel(writer, sheet_name=sheet_name, startrow=6, index=False)
            
            # Aplicar formatação específica às colunas numéricas
            for row in range(7, 7 + len(df)):
                worksheet.write(row, 2, df.iloc[row-7]['Saldo Anterior'], formato_valor)
                worksheet.write(row, 3, df.iloc[row-7]['Débito'], formato_valor)
                worksheet.write(row, 4, df.iloc[row-7]['Crédito'], formato_valor)
                worksheet.write(row, 5, df.iloc[row-7]['Saldo Atual'], formato_valor)

        return arquivo
    except Exception as e:
        raise Exception(f"Erro ao processar arquivo: {str(e)}")

# Código original para processar pasta 'arq' (mantido para compatibilidade)
if __name__ == "__main__":
    pasta = os.listdir('arq')
    
    for i in pasta:
        nome = i
        arquivo_path = f'arq/{nome}'
        try:
            arquivo_excel = processar_balancete(arquivo_path)
            print(f"Arquivo processado: {arquivo_excel}")
        except Exception as e:
            print(f"Erro ao processar {nome}: {e}")