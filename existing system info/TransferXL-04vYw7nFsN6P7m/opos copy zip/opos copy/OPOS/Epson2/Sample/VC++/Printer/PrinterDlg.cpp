// PrinterDlg.cpp : implementation file
//

#include "stdafx.h"
#include "Printer.h"
#include "PrinterDlg.h"
#include "XMLView.h"
#include "OPOSPtr.h"
#include "EPSNPtr.h"

typedef struct tITEMDATA {
    long Price;
    CString Name;
} ITEMDATA;

long cmbItem[] = { 0x0a, 0x0b, 0x14, 0x15, 0x3c, 0x46 };


#ifdef _DEBUG
#define new DEBUG_NEW
#undef THIS_FILE
static char THIS_FILE[] = __FILE__;
#endif


/////////////////////////////////////////////////////////////////////////////
// CPrinterDlg dialog

CPrinterDlg::CPrinterDlg(CWnd* pParent /*=NULL*/)
	: CDialog(CPrinterDlg::IDD, pParent)
{
	//{{AFX_DATA_INIT(CPrinterDlg)
	m_Counter = -1;
	//}}AFX_DATA_INIT
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CPrinterDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	//{{AFX_DATA_MAP(CPrinterDlg)
	DDX_Control(pDX, IDC_EDIT_RETRIEVST, m_edtRetrieveSt);
	DDX_CBIndex(pDX, IDC_CMB_COUNTER, m_Counter);
	DDX_Control(pDX, IDC_POSPRINTER1, m_Ptr1);
	//}}AFX_DATA_MAP
}

BEGIN_MESSAGE_MAP(CPrinterDlg, CDialog)
	//{{AFX_MSG_MAP(CPrinterDlg)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_WM_CLOSE()
	ON_BN_CLICKED(IDC_BTN_REC1, OnBtnRec1)
	ON_BN_CLICKED(IDC_BTN_REC2, OnBtnRec2)
	ON_BN_CLICKED(IDC_BTN_REC3, OnBtnRec3)
	ON_BN_CLICKED(IDC_BTN_SLP1, OnBtnSlp1)
	ON_BN_CLICKED(IDC_BTN_DIO1, OnBtnDio1)
	ON_BN_CLICKED(IDC_BTN_DIO2, OnBtnDio2)
	ON_BN_CLICKED(IDC_BTN_MC_RESET, OnBtnMcReset)
	ON_BN_CLICKED(IDC_BTN_MC_GET, OnBtnMcGet)
	ON_BN_CLICKED(IDC_BTN_MC_CUMULATIVE, OnBtnMcCumulative)
	ON_BN_CLICKED(IDC_BTN_RETRIEVST, OnBtnRetrievSt)
	ON_BN_CLICKED(IDC_BTN_REC4, OnBtnRec4)
	ON_BN_CLICKED(IDC_BTN_REC5, OnBtnRec5)
	ON_BN_CLICKED(IDC_BTN_REC6, OnBtnRec6)
	//}}AFX_MSG_MAP
END_MESSAGE_MAP()

/////////////////////////////////////////////////////////////////////////////
// CPrinterDlg message handlers

BOOL CPrinterDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	SetIcon(m_hIcon, TRUE);			// Set big icon
	SetIcon(m_hIcon, FALSE);		// Set small icon

	// TODO: Add extra initialization here
	BOOL bError = FALSE;
	long lRetryCount = 0;
	long pData;
	long pData2;
    CString cString;
	BSTR pString;

	while( 1 ) {
		//Open the device
		//Use a Logical Device Name which has been set on the SetupPOS.
		m_Ptr1.Open("Unit1");
		//Check whether the device is succeed to open, or not
		if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("This device has not been registered, or cannot use.");
			bError = TRUE;
			break;
		}

        //Get the exclusive control right for the opened device.
        //Then the device is disable from other application.
        //(Notice:When using an old CO, use the Claim.)
		m_Ptr1.ClaimDevice( 1000 );
        if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
            MessageBox("Fails to get the exclusive right for the device.");
			bError = TRUE;
			break;
        }

        //Enable the device.
		m_Ptr1.SetDeviceEnabled( TRUE );
		//Check whether the device is enable to use, or not
		if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
			MessageBox("Now the device is disable to use.");
			bError = TRUE;
			break;
		}

		m_Ptr1.SetMapMode( PTR_MM_METRIC );
		m_Ptr1.SetRecLetterQuality( TRUE );

		if( m_Ptr1.GetCapRecBitmap() == TRUE ) {
			lRetryCount = 0;
			do{
				m_Ptr1.SetBitmap( 1, PTR_S_RECEIPT, "Logo.bmp", m_Ptr1.GetRecLineWidth() / 2, PTR_BM_CENTER );
				if(( m_Ptr1.GetResultCode() == OPOS_E_ILLEGAL ) && ( m_Ptr1.GetResultCodeExtended() == OPOS_EX_DEVBUSY )) {
					lRetryCount = lRetryCount + 1;
					Sleep(1000);
				}
				else{
					break;
				}
			} while(lRetryCount < 5);
			if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
				MessageBox("Fails to set bitmap.");
				bError = TRUE;
				break;
			}
		}
		
		//Check on rotate print function
		if( m_Ptr1.GetCapRecLeft90() == FALSE )
			GetDlgItem(IDC_BTN_REC3)->EnableWindow(FALSE);
		//Check on slip function
		if( (m_Ptr1.GetCapSlpPresent() == FALSE) || (m_Ptr1.GetCapSlpFullslip() == FALSE) )
			GetDlgItem(IDC_BTN_SLP1)->EnableWindow(FALSE);
		//Check on PageMode function
		if( m_Ptr1.GetCapRecPageMode() == FALSE ){
			GetDlgItem(IDC_BTN_REC4)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_REC6)->EnableWindow(FALSE);
		}
		//Check on bitmap print function
		if( m_Ptr1.GetCapRecBitmap() == FALSE){
			GetDlgItem(IDC_BTN_REC5)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_REC6)->EnableWindow(FALSE);
		}
		// Check Multi-tone Function
		pData = PTR_DI_BITMAP_PRINTING_MULTI_TONE;
		pData2 = PTR_DI_BITMAP_PRINTING_NORMAL;
		cString = "";
		pString = cString.AllocSysString();
		m_Ptr1.DirectIO( PTR_DI_SET_BITMAP_PRINTING_TYPE, &pData, &pString );
		SysFreeString( pString );
		if( m_Ptr1.GetResultCode() == OPOS_SUCCESS) {
			m_Ptr1.DirectIO( PTR_DI_SET_BITMAP_PRINTING_TYPE, &pData2, &pString );
		}
		else {
			GetDlgItem(IDC_BTN_REC6)->EnableWindow(FALSE);
		}
		// Set the edit box of parameter input.
		CString	strParam = _T("ModelName,HoursPoweredCount");
		if( m_Ptr1.GetCapRecPresent() )
		{
			strParam += _T(",ReceiptCharacterPrintedCount");
		}else{
			strParam += _T(",SlipCharacterPrintedCount");
		}
		m_edtRetrieveSt.SetWindowText( strParam );

		// Checks whether it has function to obtain 
		// the statistics of devices.
		// If it does not have the function, invalidates
		// the [Retrieve Statistics] button and the edit box
		// of parameter input.
		if( !m_Ptr1.GetCapStatisticsReporting() )
		{	// CapStatisticsReporting = FALSE
			GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
			GetDlgItem(IDC_STC_DST)->EnableWindow(FALSE);
		}

		m_bStateCover = TRUE;
		m_bStatePaper = TRUE;
		m_bCoverSensor = m_Ptr1.GetCapCoverSensor();

		break;
	}

	if( bError ) {
		//Disable all buttons
		GetDlgItem(IDC_BTN_REC1)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REC2)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REC3)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REC4)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REC5)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REC6)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_SLP1)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REC1)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_DIO1)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_DIO2)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_MC_RESET)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_MC_GET)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_MC_CUMULATIVE)->EnableWindow(FALSE);
		GetDlgItem(IDC_EDIT_RETRIEVST)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_RETRIEVST)->EnableWindow(FALSE);
		m_bStateCover = FALSE;
		m_bStatePaper = FALSE;
		m_bCoverSensor = FALSE;
	}

	m_Counter = 0;
	UpdateData( FALSE );

	return TRUE;  // return TRUE  unless you set the focus to a control
}

// If you add a minimize button to your dialog, you will need the code below
//  to draw the icon.  For MFC applications using the document/view model,
//  this is automatically done for you by the framework.

void CPrinterDlg::OnPaint() 
{
	if (IsIconic())
	{
		CPaintDC dc(this); // device context for painting

		SendMessage(WM_ICONERASEBKGND, (WPARAM) dc.GetSafeHdc(), 0);

		// Center icon in client rectangle
		int cxIcon = GetSystemMetrics(SM_CXICON);
		int cyIcon = GetSystemMetrics(SM_CYICON);
		CRect rect;
		GetClientRect(&rect);
		int x = (rect.Width() - cxIcon + 1) / 2;
		int y = (rect.Height() - cyIcon + 1) / 2;

		// Draw the icon
		dc.DrawIcon(x, y, m_hIcon);
	}
	else
	{
		CDialog::OnPaint();
	}
}

HCURSOR CPrinterDlg::OnQueryDragIcon()
{
	return (HCURSOR) m_hIcon;
}

void CPrinterDlg::OnClose() 
{
    //Cancel the device
    m_Ptr1.SetDeviceEnabled( FALSE );

    //Release the device exclusive control right.
    //(Notice:When using an old CO, use the Release.)
    m_Ptr1.ReleaseDevice();

    //Finish using the device.
    m_Ptr1.Close();

	CDialog::OnClose();
}

////////////////////////////////////////////////////////////////////////////////
//	Print
//
void CPrinterDlg::OnBtnRec1() 
{
	BOOL bExit;
	double Kakaku;
	int i;
	int iRCharSize;
	ITEMDATA idBuf[5];
	CString	ESC = "\x1b";
	CString fDate;
	CString BcData;
	CString sBuf;
	CString sPrice;
	CString sSpace;
	CString sRC;
	CString sRCE;
// Barord and Bitmap combination print.
	//long lMapMode;			// MapMode property.
	//long lCenterSpace;		// The space of bitmap and barcode.(dot)
	//long lSideSpace;		// The left space of bitmap.(dot)
	//long lBmpSize;			// The bitmap width size.(dot)
	//long pData;
	//CString cString;
	//BSTR pString;

	if( m_Ptr1.GetCapRecPresent() == FALSE ) {
		MessageBox("This Printer doesn't have Receipt Station.");
		return;
	}

	SetCursor( LoadCursor( NULL, IDC_WAIT ));

// Initialization
	CTime t = CTime::GetCurrentTime();
	fDate = t.Format("%B %d, %Y  %p %I:%M");
	BcData = "4902720005074";
	bExit = FALSE;

// Make a data of the buying goods
	idBuf[0].Name = "apples";		idBuf[0].Price = 10;
	idBuf[1].Name = "grapes";		idBuf[1].Price = 20;
	idBuf[2].Name = "bananas";		idBuf[2].Price = 30;
	idBuf[3].Name = "lemons";		idBuf[3].Price = 40;
	idBuf[4].Name = "oranges";		idBuf[4].Price = 50;

	// Barord and Bitmap combination print.
	//pData = PTR_DI_UNITE_TRANSPARENT + PTR_DI_UNITE_MIDDLE_ALIGNMENT;
	//cString = "";
	//pString = cString.AllocSysString();
	//m_Ptr1.DirectIO( PTR_DI_UNITE_DATA_MODE, &pData, &pString );
	//
	//if( m_Ptr1.GetResultCode() == OPOS_SUCCESS )
	//{
	//	lMapMode = m_Ptr1.GetMapMode();
	//	m_Ptr1.SetMapMode( PTR_MM_DOTS );
	//
	//	lCenterSpace = 10;
	//	lBmpSize = m_Ptr1.GetRecLineWidth() / 2;
	//	lSideSpace = m_Ptr1.GetRecLineWidth() / 10;
	//
	//	m_Ptr1.PrintBarCode( PTR_S_RECEIPT, "http://www.epson.co.jp", PTR_BCS_OTHER + 4, m_Ptr1.GetRecLineWidth() / 4, m_Ptr1.GetRecLineWidth() / 4, lBmpSize + lSideSpace + lCenterSpace, PTR_BC_TEXT_BELOW );
	//	m_Ptr1.SetBitmap( 2, PTR_S_RECEIPT, "Logo2.bmp", lBmpSize, lSideSpace );
	//	pData = PTR_DI_UNITE_EXIT;
	//	m_Ptr1.DirectIO( PTR_DI_UNITE_DATA_MODE, &pData, &pString );
	//
	//	m_Ptr1.SetMapMode( lMapMode );
	//}
	//SysFreeString( pString );

	m_Ptr1.TransactionPrint( PTR_S_RECEIPT, PTR_TP_TRANSACTION );
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		MessageBox("Cannot use a POS Printer.");
		return;
	}

	//Loop
	while( 1 ) {
		if( m_Ptr1.GetCapRecBitmap() )
			m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|1B");

		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|N" + "123xxstreet,xxxcity,xxxxstate \n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|rA" + "TEL 9999-99-9999   C#2\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|200uF");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|cA" + fDate + "\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|500uF");
    //Print buying goods
        iRCharSize = m_Ptr1.GetRecLineChars();
		Kakaku = 0.0;

		for( i = 0; i < 5; i++ ) {
			if( m_Ptr1.GetResultCode() != OPOS_SUCCESS )
				break;
			sBuf = idBuf[i].Name;
			Kakaku += idBuf[i].Price;
			sPrice.Format("$%.2f", (double)idBuf[i].Price );
			sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
			m_Ptr1.PrintNormal( PTR_S_RECEIPT, sBuf + sSpace + sPrice + "\n");
		}
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|200uF");

    //Print the total cost
		sBuf = "Before adding tax";
		sPrice.Format("$%.2f", Kakaku );
		sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|bC" + sBuf + sSpace + sPrice + "\n");
		sBuf = "tax   5.0%";
		sPrice.Format("$%.2f", Kakaku * 0.05 );
		sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|N" + ESC + "|uC" + sBuf + sSpace + sPrice + "\n");
		sBuf = "total";
		sPrice.Format("$%.2f", Kakaku * 1.05 );
		sSpace = CString(' ', iRCharSize / 2 - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|2C" + sBuf + sSpace + sPrice + "\n");
		sBuf = "Customer's payment";
		sPrice.Format("$%.2f", 200.0 );
		sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|N" + sBuf + sSpace + sPrice + "\n");
		sBuf = "Change";
		sPrice.Format("$%.2f", 200 - Kakaku * 1.05 );
		sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, sBuf + sSpace + sPrice + "\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|500uF");

		if( m_Ptr1.GetCapRecBarCode())
			m_Ptr1.PrintBarCode( PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, m_Ptr1.GetRecLineWidth(), PTR_BC_CENTER, PTR_BC_TEXT_BELOW );

	// Barord and Bitmap combination print.
		//m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|2B" );

		sBuf.Format( "|%dlF", m_Ptr1.GetRecLinesToPaperCut());
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + sBuf);
		if( m_Ptr1.GetCapRecPapercut())
			m_Ptr1.CutPaper( 100 );

		if( m_Ptr1.GetResultCode() == OPOS_SUCCESS )
			break;

	//When error occurs, display a message to ask the user whether retry or not.
		i = MessageBox("Fails to output to a printer.\n\nRetry?", "OPOS SUMPLE", MB_ABORTRETRYIGNORE + MB_ICONQUESTION);
		if( i != IDIGNORE )				// Not "Ignore" has been selected.
            m_Ptr1.ClearOutput();
		if( i == IDABORT )				// "Cancel"has been selected
            bExit = TRUE;
		if( i != IDRETRY )				// Not "Retry"has been selected.
            break;
	}

    if( !bExit ) {						// Has it been canceled?
		// Wait until device is 'OPOS_S_IDLE'
		while( m_Ptr1.GetState() != OPOS_S_IDLE )
			;
		m_Ptr1.TransactionPrint( PTR_S_RECEIPT, PTR_TP_NORMAL );
		if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
			sRC.Format("%ld", m_Ptr1.GetResultCode());
			sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
			MessageBox("Cannot use a POS Printer\nResultCode = " + sRC + "\nResultCodeExtended = " + sRCE );
			// Clear the buffered data since the buffer retains print data 
			// when an error occurs during printing.
			m_Ptr1.ClearOutput();
		}
	}

	SetCursor( LoadCursor( NULL, IDC_ARROW ));
}

////////////////////////////////////////////////////////////////////////////////
//	Asynchronous printing
//
void CPrinterDlg::OnBtnRec2() 
{
	BOOL bExit;
	double Kakaku;
	int i;
	int iRCharSize;
	ITEMDATA idBuf[5];
	CString	ESC = "\x1b";
	CString fDate;
	CString BcData;
	CString sBuf;
	CString sRC;
	CString sRCE;
	CString sPrice;
	CString sSpace;

	if( m_Ptr1.GetCapRecPresent() == FALSE ) {
		MessageBox("This Printer doesn't have Receipt Station.");
		return;
	}

	SetCursor( LoadCursor( NULL, IDC_WAIT ));

// Initialization
	CTime t = CTime::GetCurrentTime();
	fDate = t.Format("%B %d, %Y  %p %I:%M");
	BcData = "4902720005074";
	bExit = FALSE;

// Make a data of the buying goods
	idBuf[0].Name = "apples";		idBuf[0].Price = 10;
	idBuf[1].Name = "grapes";		idBuf[1].Price = 20;
	idBuf[2].Name = "bananas";		idBuf[2].Price = 30;
	idBuf[3].Name = "lemons";		idBuf[3].Price = 40;
	idBuf[4].Name = "oranges";		idBuf[4].Price = 50;

	m_Ptr1.SetAsyncMode( TRUE );
	m_Ptr1.TransactionPrint( PTR_S_RECEIPT, PTR_TP_TRANSACTION );
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		MessageBox("Cannot use a POS Printer.");
		return;
	}

	//Loop
	while( 1 ) {
		if( m_Ptr1.GetCapRecBitmap() )
			m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|1B");

		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|N" + "123xxstreet,xxxcity,xxxxstate \n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|rA" + "TEL 9999-99-9999   C#2\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|200uF");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|cA" + fDate + "\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|500uF");
    //Print buying goods
        iRCharSize = m_Ptr1.GetRecLineChars();
		Kakaku = 0.0;

		for( i = 0; i < 5; i++ ) {
			if( m_Ptr1.GetResultCode() != OPOS_SUCCESS )
				break;
			sBuf = idBuf[i].Name;
			Kakaku += idBuf[i].Price;
			sPrice.Format("$%.2f", (double)idBuf[i].Price );
			sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
			m_Ptr1.PrintNormal( PTR_S_RECEIPT, sBuf + sSpace + sPrice + "\n");
		}
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|200uF");

    //Print the total cost
		sBuf = "Before adding tax";
		sPrice.Format("$%.2f", Kakaku );
		sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|bC" + sBuf + sSpace + sPrice + "\n");
		sBuf = "tax   5.0%";
		sPrice.Format("$%.2f", Kakaku * 0.05 );
		sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|N" + ESC + "|uC" + sBuf + sSpace + sPrice + "\n");
		sBuf = "total";
		sPrice.Format("$%.2f", Kakaku * 1.05 );
		sSpace = CString(' ', iRCharSize / 2 - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|N" + ESC + "|bC" + ESC + "|2C" + sBuf + sSpace + sPrice + "\n");
		sBuf = "Customer's payment";
		sPrice.Format("$%.2f", 200.0 );
		sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|N" + sBuf + sSpace + sPrice + "\n");
		sBuf = "Change";
		sPrice.Format("$%.2f", 200 - Kakaku * 1.05 );
		sSpace = CString(' ', iRCharSize - (sBuf.GetLength() + sPrice.GetLength()));
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, sBuf + sSpace + sPrice + "\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|500uF");

		if( m_Ptr1.GetCapRecBarCode())
			m_Ptr1.PrintBarCode( PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, m_Ptr1.GetRecLineWidth(), PTR_BC_CENTER, PTR_BC_TEXT_BELOW );

		sBuf.Format( "|%dlF", m_Ptr1.GetRecLinesToPaperCut());
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + sBuf);
		if( m_Ptr1.GetCapRecPapercut())
			m_Ptr1.CutPaper( 100 );

		if( m_Ptr1.GetResultCode() == OPOS_SUCCESS )
			break;

	//When error occurs, display a message to ask the user whether retry or not.
		i = MessageBox("Fails to output to a printer.\n\nRetry?", "OPOS SUMPLE", MB_ABORTRETRYIGNORE + MB_ICONQUESTION);
		if( i != IDIGNORE )				// Not "Ignore" has been selected.
            m_Ptr1.ClearOutput();
		if( i == IDABORT )				// "Cancel"has been selected
            bExit = TRUE;
		if( i != IDRETRY )				// Not "Retry"has been selected.
            break;
	}

    if( !bExit ) {						//Has it been canceled?
		m_Ptr1.TransactionPrint( PTR_S_RECEIPT, PTR_TP_NORMAL );
		if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
			sRC.Format("%ld", m_Ptr1.GetResultCode());
			sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
			MessageBox("Cannot use a POS Printer\nResultCode = " + sRC + "\nResultCodeExtended = " + sRCE );
			// Clear the buffered data since the buffer retains print data 
			// when an error occurs during printing.
			m_Ptr1.ClearOutput();
		}
	}

	m_Ptr1.SetAsyncMode( FALSE );

	SetCursor( LoadCursor( NULL, IDC_ARROW ));
}

////////////////////////////////////////////////////////////////////////////////
//	Print Receipt
//
void CPrinterDlg::OnBtnRec3() 
{
	BOOL bExit;
	int i;
	long Spacing;
	long Height;
	long RotateType;
	CString ESC = "\x1b";
	CString fDate;
	CString sBuf;
	CString sRC;
	CString sRCE;
	CString BcData;
	bool bBitmapPrint;
	bool bBarcodePrint;

//Sets BitmapMode to NORMAL
	//long pData;
	//CString cString;
	//BSTR pString;

	if( m_Ptr1.GetCapRecPresent() == FALSE ) {
		MessageBox("This Printer doesn't have Receipt Station.");
		return;
	}

	if( m_Ptr1.GetCapRecLeft90() == FALSE ) {
		MessageBox("This printer doesn't have a rotation printing function.");
		return;
	}

	RotateType = 0;
	bBitmapPrint = false;
	bBarcodePrint = false;
	if (m_Ptr1.GetCapRecBitmap() != NULL)
	{
		if (strstr(m_Ptr1.GetRecBitmapRotationList(), "L90") != NULL)
		{
			RotateType = RotateType + PTR_RP_BITMAP;
			bBitmapPrint = true;
		}
	}
	if (m_Ptr1.GetCapRecBarCode() != NULL)
	{
		if (strstr(m_Ptr1.GetRecBarCodeRotationList(), "L90") != NULL)
		{
			RotateType = RotateType + PTR_RP_BARCODE;
			bBarcodePrint = true;
		}
	}


// Initialization
	CTime t = CTime::GetCurrentTime();
	fDate = t.Format("%B %d, %Y  %p %I:%M");
	bExit = FALSE;
	BcData = "4902720005074";

	//Batch processing mode
	m_Ptr1.TransactionPrint( PTR_S_RECEIPT, PTR_TP_TRANSACTION );
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		MessageBox("Cannot use a POS Printer.");
		return;
	}
	//Rotate 90
	m_Ptr1.RotatePrint( PTR_S_RECEIPT, PTR_RP_LEFT90 + RotateType );

	//Loop
	while(1) {
		Spacing = m_Ptr1.GetRecLineSpacing();			//Keep the default line spacing
		Height = m_Ptr1.GetRecLineHeight();				//Keep the default line height
    
		//Printing process

	//Sets BitmapMode to NORMAL
		//pData = PTR_DI_BMP_NORMAL;
		//cString = "";
		//pString = cString.AllocSysString();
		//m_Ptr1.DirectIO( PTR_DI_SET_BITMAP_MODE, &pData, &pString );
		//SysFreeString( pString );

		if (bBitmapPrint)
			m_Ptr1.PrintBitmap( PTR_S_RECEIPT, "Logo.bmp", m_Ptr1.GetRecLineWidth() / 5, PTR_BM_CENTER );

		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|4C" + ESC + "|bC   Receipt     ");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|3C" + ESC + "|2uC       Mr. Brawn\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|2uC                                                  \n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|2uC" + ESC + "|3C        Total payment              $" + ESC + "|4C21.00  ");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|1C" + "\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, fDate + " Received\n\n");
		m_Ptr1.SetRecLineHeight( 24 );
		m_Ptr1.SetRecLineSpacing( m_Ptr1.GetRecLineHeight());
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|uC Detais               \n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|1C                          " + ESC + "|2COPOS Store\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|uC Tax excluded    $20.00\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|1C                          " + ESC + "|bCZip code 999-9999\n");
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + "|uC Tax(5%)        $1.00" + ESC + "|N    Phone#(9999)99-9998\n\n");

		if (bBarcodePrint)
			m_Ptr1.PrintBarCode( PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 500, m_Ptr1.GetRecLineWidth() / 2, PTR_BC_CENTER, PTR_BC_TEXT_BELOW );

		//When outputting normally,breakout of the loop.
		if( m_Ptr1.GetResultCode() == OPOS_SUCCESS )
			break;

		//When error occurs, display a message to ask the user whether retry or not.
		i = MessageBox("Fails to output to a printer.\n\nRetry?", "OPOS SUMPLE", MB_ABORTRETRYIGNORE + MB_ICONQUESTION);
		if( i != IDIGNORE )				// Not "Ignore" has been selected.
			m_Ptr1.ClearOutput();
		if( i == IDABORT )				// "Cancel"has been selected
			bExit = TRUE;
		if( i != IDRETRY )				// Not "Retry"has been selected.
			break;
	}

	m_Ptr1.RotatePrint( PTR_S_RECEIPT, PTR_RP_NORMAL );

	if( !bExit ) {
		if( m_Ptr1.GetResultCode() == OPOS_SUCCESS ) {
			sBuf.Format( "|%dlF", m_Ptr1.GetRecLinesToPaperCut());
			m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + sBuf);
			if( m_Ptr1.GetCapRecPapercut())
				m_Ptr1.CutPaper( 100 );
		}
		else {
			sBuf.Format("%ld", m_Ptr1.GetResultCode());
			sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
			MessageBox("Cannot use a POS Printer\nResultCode = " + sBuf + "\nResultCodeExtended = " + sRCE );
			m_Ptr1.ClearOutput();
		}
	}

	m_Ptr1.SetRecLineSpacing( Spacing );
	m_Ptr1.SetRecLineHeight( Height );

	// Wait until device is 'OPOS_S_IDLE'
	while( m_Ptr1.GetState() != OPOS_S_IDLE )
		;
	//Print all the buffer data, and exit the batch processing mode.
	m_Ptr1.TransactionPrint( PTR_S_RECEIPT, PTR_TP_NORMAL );
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		sRC.Format("%ld", m_Ptr1.GetResultCode());
		sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
		MessageBox("Cannot use a POS Printer\nResultCode = " + sRC + "\nResultCodeExtended = " + sRCE );
		// Clear the buffered data since the buffer retains print data 
		// when an error occurs during printing.
		m_Ptr1.ClearOutput();
	}
}


////////////////////////////////////////////////////////////////////////////////
//	Coupon ticket printing
//
void CPrinterDlg::OnBtnRec4() 
{
	long lPMDescriptorList[3];
	long lGetPMDescriptor, lCount;
	long lVPosition;
	BOOL bBitmapPrint, bBarcodePrint;
	CString ESC = "\x1b";
	CString fDate;
	CString BcData;
	CString strOutputData, strRC, strRCE;
	CString strPMArea, strMaxHArea, strMaxVArea, strSetHPositon, strSetVPosition;

	if( m_Ptr1.GetCapRecPresent() == FALSE ) {
		MessageBox("This Printer doesn't have Receipt Station.");
		return;
	}
	if( m_Ptr1.GetCapRecPageMode() == FALSE ) {
		MessageBox("This printer doesn't have a PageMode printing function.");
		return;
	}

	// Initialization
	CTime t = CTime::GetCurrentTime();
	fDate = t.Format("%B %d, %Y  %p %I:%M");
	BcData = "4902720005074";

	lPMDescriptorList[0] = PTR_PM_BM_ROTATE;
    lPMDescriptorList[1] = PTR_PM_BC_ROTATE;
    lPMDescriptorList[2] = PTR_PM_OPAQUE;

	// Select of target station of PageMode
	m_Ptr1.SetPageModeStation(PTR_S_RECEIPT);
    lGetPMDescriptor = m_Ptr1.GetPageModeDescriptor();

    for(lCount = 2;lCount >= 0;lCount--){
		if(lPMDescriptorList[lCount] <= lGetPMDescriptor){
			lGetPMDescriptor = lGetPMDescriptor - lPMDescriptorList[lCount];
			switch (lCount){
				case 0:
					if (m_Ptr1.GetCapRecBitmap()) {
						if (strstr(m_Ptr1.GetRecBitmapRotationList(), "R90") != NULL)
						{
							bBitmapPrint = true;
						}
					}
					break;
				case 1:
					if (m_Ptr1.GetCapRecBarCode()) {
						if (strstr(m_Ptr1.GetRecBarCodeRotationList(), "R90") != NULL)
						{
							bBarcodePrint = true;
						}
					}
					break;
			}
		}
	}

	// PageMode
	m_Ptr1.PageModePrint(PTR_PM_PAGE_MODE);
	// Initialization of PageMode area
	m_Ptr1.SetPageModePrintArea("0,0,0,0");
	m_Ptr1.SetPageModeHorizontalPosition(0);
	m_Ptr1.SetPageModeVerticalPosition(0);
        
	m_Ptr1.SetPageModePrintDirection(PTR_PD_LEFT_TO_RIGHT);
	strPMArea = m_Ptr1.GetPageModeArea();
	// Gets the maximum size of PageMode area
	lCount = strPMArea.Find(",");
	strMaxHArea = strPMArea.Left(lCount);
	strMaxVArea = strPMArea.Right(strPMArea.GetLength() - (lCount + 1));
	// first PageMode area
	lVPosition = m_Ptr1.GetRecLineSpacing() * 2;
	strSetVPosition.Format("%d", lVPosition);
	strPMArea = "0,0," + strMaxHArea + "," + strSetVPosition;
	m_Ptr1.SetPageModePrintArea(strPMArea);
        
	strOutputData = "OPOS Store";
	lCount = (m_Ptr1.GetRecLineChars() - (strOutputData.GetLength() * 2)) / 4;
	for (int i=lCount;i!=0;i--){
		strOutputData = " " + strOutputData + " ";
	}
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|4C" + ESC + "|cA" + ESC + "|2uC" + strOutputData + "\n");

	// Right90
	lVPosition = atoi(strMaxVArea);
	if (lVPosition > 12000){
		// Setting of Vertical Maximum value
		strMaxVArea = "12000";
	}
	// second PageMode area
	strPMArea = "0," + strSetVPosition + "," + strMaxHArea + ",";
	lCount = atoi(strMaxVArea);
	lVPosition = atoi(strSetVPosition);
	lVPosition = lCount - lVPosition;
	strSetVPosition.Format("%d", lVPosition);
	strPMArea = strPMArea + strSetVPosition;
	m_Ptr1.SetPageModePrintArea(strPMArea);
	m_Ptr1.SetPageModePrintDirection(PTR_PD_TOP_TO_BOTTOM);
	// Printing bitmap
	if (bBitmapPrint) {
		m_Ptr1.PrintBitmap(PTR_S_RECEIPT, "Logo.bmp", m_Ptr1.GetRecLineWidth() / 4, PTR_BM_LEFT);
	}
        
	m_Ptr1.SetPageModeHorizontalPosition(m_Ptr1.GetRecLineWidth() / 4);
	m_Ptr1.SetPageModeVerticalPosition(m_Ptr1.GetRecLineSpacing());
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|4CCoupon ticket" + "\n");
        
	m_Ptr1.SetPageModeVerticalPosition(0);
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|rA123xxStreet,xxCity,xxState" + "\n");
	m_Ptr1.SetPageModeVerticalPosition(m_Ptr1.GetRecLineSpacing());
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|rATEL 9999-99-9999" + "\n");
	m_Ptr1.SetPageModeVerticalPosition(m_Ptr1.GetRecLineSpacing() * 2);
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|rA" + fDate + "\n");
        
	m_Ptr1.SetPageModeHorizontalPosition(0);
	lVPosition = m_Ptr1.GetRecLineWidth() / 4; // a criterion value of Vertical position
	m_Ptr1.SetPageModeVerticalPosition(lVPosition);
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, "The following amount will be deducted \nfrom your total sales at the register \nby showing us this coupon.\n");
	m_Ptr1.SetPageModeHorizontalPosition((m_Ptr1.GetRecLineWidth() / m_Ptr1.GetRecLineChars()) * 3);
	m_Ptr1.SetPageModeVerticalPosition(lVPosition + (m_Ptr1.GetRecLineSpacing() * 4));
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|bCper coupon" + "\n");

	m_Ptr1.SetPageModeHorizontalPosition(0);
	m_Ptr1.SetPageModeVerticalPosition(lVPosition + (m_Ptr1.GetRecLineSpacing() * 4));
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|2uC                                    " + "\n");
	m_Ptr1.SetPageModeVerticalPosition(lVPosition + (m_Ptr1.GetRecLineSpacing() * 5));
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|4C" + ESC + "|2uC      $1.00  OFF  " + "\n");
        
	m_Ptr1.SetPageModeHorizontalPosition((m_Ptr1.GetRecLineWidth() / m_Ptr1.GetRecLineChars()) * 9);
	m_Ptr1.SetPageModeVerticalPosition(lVPosition + (m_Ptr1.GetRecLineSpacing() * 7));
	fDate.Format("%d", atoi(t.Format("%Y")) + 1);
	fDate = t.Format("%B %d, ") + fDate;
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|bCExpiration Date : " + fDate + "\n");

	// Printing Barcode
	if (bBarcodePrint) {
		m_Ptr1.SetPageModeHorizontalPosition(0);
		m_Ptr1.SetPageModeVerticalPosition(m_Ptr1.GetRecLineSpacing() * 5);
		m_Ptr1.PrintBarCode(PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, m_Ptr1.GetRecLineWidth() / 3, PTR_BC_RIGHT, PTR_BC_TEXT_BELOW);
	}
        
	m_Ptr1.PageModePrint(PTR_PM_NORMAL);

	if( m_Ptr1.GetResultCode() == OPOS_SUCCESS ) {
		strOutputData.Format( "|%dlF", m_Ptr1.GetRecLinesToPaperCut());
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + strOutputData);
		if( m_Ptr1.GetCapRecPapercut())
			m_Ptr1.CutPaper( 100 );
	}
	else {
		strRC.Format("%ld", m_Ptr1.GetResultCode());
		strRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
		MessageBox("Cannot use a POS Printer\nResultCode = " + strRC + "\nResultCodeExtended = " + strRCE );
		m_Ptr1.PageModePrint(PTR_PM_CANCEL);
	}
	
}

////////////////////////////////////////////////////////////////////////////////
//	Print Sales Slip
//
void CPrinterDlg::OnBtnSlp1() 
{
	long RecNo;
	CString ESC = "\x1b";
	CString fDate;
	CString fTime;
	CString fRecNo;
	CString fName;
	CString fSpace;
	CString OutputData;
	bool bValiFlg;
	CString sRC;
	CString sRCE;

//When Validation is used.
	//long pData;
	//BSTR pString;

	bValiFlg = FALSE;

//When Validation is used.
	//pData = PTR_DI_SLIP_VALIDATION;
	//bValiFlg = TRUE;
	//m_Ptr1.DirectIO (PTR_DI_SELECT_SLIP, &pData, &pString);

//Request for inserting a slip
	if( SlpInsertion() == FALSE )
		return;

	SetCursor( LoadCursor( NULL, IDC_WAIT ));

// Initialization
	CTime t = CTime::GetCurrentTime();
	fDate = t.Format("%B %d, %Y");							//System date
	fTime = t.Format("%I:%M");								//System time
	RecNo = 1;												//Register No.
	fRecNo.Format( "  000%d",RecNo);
	fName = "ABCDEF";										//Casher No.
	fSpace = CString(' ', m_Ptr1.GetSlpLineChars() - 40 );	//Left space

	// Print data
	OutputData = "\n" + fSpace + "Print credit card sales slip\n";
	OutputData = OutputData + ESC + "|1lF";
	OutputData = OutputData + fSpace + "  SEIKO EPSON Corp.\n";
	OutputData = OutputData + fSpace + "  Thank you for coming to our shop! \n";
	OutputData = OutputData + fSpace + "  We look forward to seeing you again! \n";
	if (!bValiFlg)
	{
	OutputData = OutputData + ESC + "|1lF";
	OutputData = OutputData + fSpace + "Date " + fDate + "\n";
	OutputData = OutputData + fSpace + "Time      " + fTime + "Casher   " + fName + "\n";
	OutputData = OutputData + fSpace + "Number of the register" + fRecNo + "\n";
	OutputData = OutputData + ESC + "|N" + ESC + "|1lF";
	OutputData = OutputData + fSpace + "Details                        cost\n";
	OutputData = OutputData + fSpace + "Cardigan                   $ 100.00\n";
	OutputData = OutputData + fSpace + "Shoes                       $ 70.00\n";
	OutputData = OutputData + fSpace + "Hat                         $ 30.00\n";
	OutputData = OutputData + fSpace + "Bag                        $ 150.00\n";
	OutputData = OutputData + fSpace + "          Excluded tax     $ 350.00\n";
	OutputData = OutputData + fSpace + "          Tax(5%)           $ 17.50\n";
	OutputData = OutputData + fSpace + "          -------------------------\n";
	OutputData = OutputData + fSpace + ESC + "|2C     Total" + ESC + "|1C       $ 367.50\n";
	OutputData = OutputData + ESC + "|1lF";
	OutputData = OutputData + fSpace + "Company name   EPSON-CARD\n";
	OutputData = OutputData + fSpace + "Membership No. XXXXXXXXXXXXXXXX\n";
	OutputData = OutputData + fSpace + "Valid date     12/05\n";
	OutputData = OutputData + fSpace + "Handling No.   9999 - 999999\n";
	OutputData = OutputData + fSpace + "Approval No.   99\n";
	OutputData = OutputData + ESC + "|1lF";
	OutputData = OutputData + fSpace + "Siguniture\n";
	}
	// Printing process
	m_Ptr1.PrintNormal( PTR_S_SLIP, OutputData );
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		sRC.Format("%ld", m_Ptr1.GetResultCode());
		sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
		MessageBox("Cannot use a POS Printer\nResultCode = " + sRC + "\nResultCodeExtended = " + sRCE );
	}

	// Clean up
	SetCursor( LoadCursor( NULL, IDC_ARROW ));

	//Remove the slip at the slip station.
	if( SlpRemoval() == FALSE ) {
		;	//Fail
	}

//When Validation is used.
	//pData = PTR_DI_SLIP_FULLSLIP;
	//m_Ptr1.DirectIO (PTR_DI_SELECT_SLIP, &pData, &pString);

}

////////////////////////////////////////////////////////////////////////////////
//	Shift Print Position (DirectIO)
//
// Control the initial position of the printer using the Direct IO.
// Useful for printing neatly.
//
void CPrinterDlg::OnBtnDio1() 
{
//   ESC/POS command
//       ESC = n             n = 1
//           Explanation: Printer selection command
//
//       ESC $ nL nH         nL, nH = Voluntary nunber among 0-255
//           Explanation: Move the printing position to nL + nH x 256 from the left side.

	long pData;
	CString cString;
	BSTR pString;
	CString sRC;
	CString sRCE;

	pData = 0;
// Connect a printer directly.(Support Hydra connection)
	cString  = CString( _T("\x1b\x3d\x01"), 3 );
// Move the printing position to nL + nH x 256 from the left side.
	cString += CString( _T("\x1b\x24\x64\x00\x00"), 5 );
	pString = cString.AllocSysString();
	m_Ptr1.DirectIO( PTR_DI_OUTPUT_NORMAL, &pData, &pString );
	SysFreeString( pString );
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		sRC.Format("%ld", m_Ptr1.GetResultCode());
		sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
		MessageBox("Cannot use a POS Printer\nResultCode = " + sRC + "\nResultCodeExtended = " + sRCE );
		return;
	}

// Test printing
	m_Ptr1.PrintNormal( PTR_S_RECEIPT, "DirectIO\n");
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		sRC.Format("%ld", m_Ptr1.GetResultCode());
		sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
		MessageBox("Cannot use a POS Printer\nResultCode = " + sRC + "\nResultCodeExtended = " + sRCE );
		return;
	}
}

////////////////////////////////////////////////////////////////////////////////
//	Use NVRAM (DirectIO)
//
// In using Direct IO, use the NVRAM to print a bitmap .
//
void CPrinterDlg::OnBtnDio2() 
{
	long pData;
	CString cString;
	BSTR pString;
	CString sRC;
	CString sRCE;

// Needed to register the bitmap before using it.
// TMLlogo can be start up individually from the Device Specific Settings of the SetupPOS.

    pData = 1;				//Number of the registered bitmap.
    cString = "";
    pString = cString.AllocSysString();
    m_Ptr1.DirectIO( PTR_DI_PRINT_FLASH_BITMAP, &pData, &pString );
	SysFreeString( pString );
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		sRC.Format("%ld", m_Ptr1.GetResultCode());
		sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
		MessageBox("Cannot use a POS Printer\nResultCode = " + sRC + "\nResultCodeExtended = " + sRCE );
	}
    
// Color bitmap or J7000/7100

// pData = 2097184;     //Number of the registered bitmap.Keycode 32,32(High=32 Low=32); 2097184 = (High << 16 ) + Low
// cString = "";
// pString = cString.AllocSysString();
// m_Ptr1.DirectIO( PTR_DI_PRINT_FLASH_BITMAP2, &pData, &pString );
// SysFreeString( pString );

}

////////////////////////////////////////////////////////////////////////////////
//	Reset (mainenance counter)
//
void CPrinterDlg::OnBtnMcReset() 
{
	long lRet;
	long lCounterNum;
	CString cString(' ', 128 );
	BSTR strCounter;

	UpdateData( TRUE );
	lCounterNum = cmbItem[m_Counter];
	strCounter = cString.AllocSysString();

    //In using the DirectIO method, use functions of the maintenance counter.
	lRet = m_Ptr1.DirectIO( PTR_DI_RESET_MAINTENANCE_COUNTER, &lCounterNum, &strCounter );
    if( lRet == OPOS_SUCCESS )
		GetDlgItem(IDC_EDIT_COUNTER)->SetWindowText("Success.");
	else
        GetDlgItem(IDC_EDIT_COUNTER)->SetWindowText("Error.");
	SysFreeString( strCounter );
}

////////////////////////////////////////////////////////////////////////////////
//	Get (mainenance counter)
//
void CPrinterDlg::OnBtnMcGet() 
{
	long lRet;
	long lCounterNum;
	CString cString(' ', 128 );
	BSTR strCounter;
	
	UpdateData( TRUE );
	lCounterNum = cmbItem[m_Counter];
	strCounter = cString.AllocSysString();

    //In using the DirectIO method, use functions of the maintenance counter.
	lRet = m_Ptr1.DirectIO( PTR_DI_GET_MAINTENANCE_COUNTER, &lCounterNum, &strCounter );
 
	long lDataLen = SysStringByteLen(strCounter);
	LPTSTR pCounter;
	pCounter = new TCHAR[lDataLen];
	int iLength = WideCharToMultiByte(
		CP_ACP,			// code page
		0,				// performance and mapping flags
		strCounter,		// address of wide-character string
		lDataLen / 2,	// number of characters in string
		pCounter,		// address of buffer for new string
		lDataLen,		// size of buffer
		NULL,			// address of default for unmappable characters
		NULL);			// address of flag set when default char. used
	
	if( lRet == OPOS_SUCCESS )
        GetDlgItem(IDC_EDIT_COUNTER)->SetWindowText( (LPCTSTR)pCounter );
	else
        GetDlgItem(IDC_EDIT_COUNTER)->SetWindowText("Error.");
	SysFreeString( strCounter );

	delete [] pCounter;
}

////////////////////////////////////////////////////////////////////////////////
//	Cumulative (mainenance counter)
//
void CPrinterDlg::OnBtnMcCumulative() 
{
	long lRet;
	long lCounterNum;
	CString cString(' ', 128 );
	BSTR strCounter;

	UpdateData( TRUE );
    lCounterNum = cmbItem[m_Counter] | 0x80;
	strCounter = cString.AllocSysString();

    //In using the DirectIO method, use functions of the maintenance counter.
	lRet = m_Ptr1.DirectIO( PTR_DI_GET_MAINTENANCE_COUNTER, &lCounterNum, &strCounter );
   
	long lDataLen = SysStringByteLen(strCounter);
	LPTSTR pCounter;
	pCounter = new TCHAR[lDataLen];
	int iLength = WideCharToMultiByte(
		CP_ACP,			// code page
		0,				// performance and mapping flags
		strCounter,		// address of wide-character string
		lDataLen / 2,	// number of characters in string
		pCounter,		// address of buffer for new string
		lDataLen,		// size of buffer
		NULL,			// address of default for unmappable characters
		NULL);			// address of flag set when default char. used

	if( lRet == OPOS_SUCCESS )
        GetDlgItem(IDC_EDIT_COUNTER)->SetWindowText( (LPCTSTR)pCounter );
	else
        GetDlgItem(IDC_EDIT_COUNTER)->SetWindowText("Error.");
	SysFreeString( strCounter );

	delete [] pCounter;
}

////////////////////////////////////////////////////////////////////////////////
//	SlpInsertion()
//
BOOL CPrinterDlg::SlpInsertion()
{
	long lRet;
	long SlpPrintable;
	BOOL bEndInsert;
	CString pMSG;

	//Insert sheet
	bEndInsert = FALSE;
	SlpPrintable = 1;

	while( SlpPrintable ) {
		m_Ptr1.BeginInsertion( 500 );
		//Check a sheet/Error check
		if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
			switch( m_Ptr1.GetResultCode()) {
			case OPOS_E_TIMEOUT:
				pMSG = "Insert slip.";
				break;
			case OPOS_E_ILLEGAL:
				if( m_Ptr1.GetSlpEmpty()) {
					pMSG = "Remove slip.";
					bEndInsert = TRUE;
					m_Ptr1.EndInsertion();
				}
				else {
					pMSG = GetErrorMsg();
					m_Ptr1.BeginRemoval( -1 );
				}
				break;
			default:
				pMSG = GetErrorMsg();
			}
        
			lRet = MessageBox( pMSG, "Print credit sales slip ", MB_RETRYCANCEL );
			if( bEndInsert ) {
				m_Ptr1.EndInsertion();
				bEndInsert = FALSE;
			}
			// Cancel
			if( lRet == IDCANCEL ) {
				m_Ptr1.EndInsertion();
				m_Ptr1.BeginRemoval( -1 );
				m_Ptr1.EndRemoval();
				return FALSE;
			}
		}
		else {
			m_Ptr1.EndInsertion();
			pMSG = "";
			switch( m_Ptr1.GetResultCode()) {
			case OPOS_E_EXTENDED:
				if( m_Ptr1.GetResultCodeExtended() == OPOS_EPTR_SLP_EMPTY ) {
					pMSG = "Insert slip.";
				}
				break;
			case OPOS_SUCCESS:
				//Slip is removed.
				if( m_Ptr1.GetSlpNearEnd() == TRUE ) {
					m_Ptr1.BeginRemoval( -1 );
					pMSG = "Insert slip.";
				}
				//Cover is open.
				else if( m_Ptr1.GetCoverOpen()) {
					pMSG = "Close the cover";
				}
				else {
					SlpPrintable = 0;
				}
				break;
			case OPOS_E_ILLEGAL:
				if(( m_Ptr1.GetCoverOpen())&&( m_Ptr1.GetSlpEmpty())) {
					pMSG = "Insert slip";
					SlpPrintable = 0;
				}
				else {
					pMSG = "Insert slip";
					m_Ptr1.Close();
					m_Ptr1.Open("Unit1");
					m_Ptr1.ClaimDevice( -1 );
					m_Ptr1.SetDeviceEnabled( TRUE );
				}
			}
                
			if( pMSG != "" ) {
				lRet = MessageBox( pMSG, "Print credit sales slip", MB_RETRYCANCEL );
				if( lRet == IDCANCEL ) {
					m_Ptr1.EndInsertion();
					m_Ptr1.BeginRemoval(-1);
					m_Ptr1.EndRemoval();
					return FALSE;
				}
			}
		}
	}

	return TRUE;
}

////////////////////////////////////////////////////////////////////////////////
//	SlpRemoval()
//
BOOL CPrinterDlg::SlpRemoval()
{
	long RecPrintable;
	long lRet;
	CString pMSG;

	RecPrintable = 1;
	while( RecPrintable ) {
		m_Ptr1.BeginRemoval( 5000 );
		if( m_Ptr1.GetResultCode() != OPOS_E_TIMEOUT )
			RecPrintable = 0;
		else
			lRet = MessageBox("Remove slip", "Print credit sales slip", MB_OK + MB_ICONEXCLAMATION );
	}

	if( m_Ptr1.GetResultCode() != OPOS_E_ILLEGAL ) {
		RecPrintable = 1;
		while( RecPrintable ) {
			m_Ptr1.EndRemoval();
			if( m_Ptr1.GetResultCode() == OPOS_SUCCESS ) {
				RecPrintable = 0;
			}
			else {
				pMSG = GetErrorMsg();
				lRet = MessageBox( pMSG, "Print credit sales slip", MB_RETRYCANCEL + MB_ICONQUESTION );
				//Canceled
				if( lRet == IDCANCEL ) {
					return FALSE;
				}
			}
		}
	}
	else {
		m_Ptr1.EndRemoval();
	}

	return TRUE;
}

////////////////////////////////////////////////////////////////////////////////
//	GetErrorMsg()
//
CString CPrinterDlg::GetErrorMsg()
{
    CString BF;

//Make messages on each event information
    switch( m_Ptr1.GetResultCodeExtended()) {
    case OPOS_EPTR_COVER_OPEN:
        BF = "Printer cover is open.";
    case OPOS_EPTR_JRN_EMPTY:
        BF = "No jurnal paper.";
    case OPOS_EPTR_REC_EMPTY:
        BF = "No receipt paper.";
    case OPOS_EPTR_SLP_EMPTY:
        BF = "No slip form.";
    default:
		BF.Format("ResultCode = %ld\nResultCodeExtended = %ld", m_Ptr1.GetResultCode(), m_Ptr1.GetResultCodeExtended());
    }

    return BF;
}

////////////////////////////////////////////////////////////////////////////////
//	Events
//
BEGIN_EVENTSINK_MAP(CPrinterDlg, CDialog)
    //{{AFX_EVENTSINK_MAP(CPrinterDlg)
	ON_EVENT(CPrinterDlg, IDC_POSPRINTER1, 3 /* ErrorEvent */, OnErrorEventPosprinter1, VTS_I4 VTS_I4 VTS_I4 VTS_PI4)
	ON_EVENT(CPrinterDlg, IDC_POSPRINTER1, 4 /* OutputCompleteEvent */, OnOutputCompleteEventPosprinter1, VTS_I4)
	ON_EVENT(CPrinterDlg, IDC_POSPRINTER1, 5 /* StatusUpdateEvent */, OnStatusUpdateEventPosprinter1, VTS_I4)
	//}}AFX_EVENTSINK_MAP
END_EVENTSINK_MAP()

////////////////////////////////////////////////////////////////////////////////
//	ErrorEvent
//
void CPrinterDlg::OnErrorEventPosprinter1(long ResultCode, long ResultCodeExtended, long ErrorLocus, long FAR* pErrorResponse) 
{
	long	lRet;
	CString sRC;
	CString sRCE;

	sRC.Format("ResultCode = %ld\n", ResultCode );
	sRCE.Format("ResultCodeExtended = %ld\n", ResultCodeExtended );
	lRet = MessageBox("Printer Error.\n\n" + sRC + sRCE, "ErrorEvent", MB_ICONINFORMATION | MB_RETRYCANCEL );
	if( lRet == IDCANCEL )
	{
		*pErrorResponse = OPOS_ER_CLEAR;
	}
}

////////////////////////////////////////////////////////////////////////////////
//	OutputCompleteEvent
//
void CPrinterDlg::OnOutputCompleteEventPosprinter1(long OutputID) 
{
// Notify that printing is completed when it is asnchronous.
    MessageBox("Complete printing", "OutputCompleteEvent", MB_ICONINFORMATION );
}

////////////////////////////////////////////////////////////////////////////////
//	StatusUpdateEvent
//
// When there is a change of the status on the printer, the event is fired.
//
void CPrinterDlg::OnStatusUpdateEventPosprinter1(long Data) 
{
    BOOL bRecEnb = TRUE;
	long pData;
	long pData2;
    CString cString;
	BSTR pString;

//Make messages for the each event information.
	switch( Data )
	{
	case PTR_SUE_COVER_OPEN:        // Printer cover is open.
		m_bStateCover = FALSE;
		break;
    case PTR_SUE_REC_EMPTY:			// No receipt paper.
        m_bStatePaper = FALSE;
		break;
    case PTR_SUE_COVER_OK:			// Printer cover is close.
        m_bStateCover = TRUE;
		break;
    case PTR_SUE_REC_PAPEROK:		// Receipt paper is ok.
    case PTR_SUE_REC_NEAREMPTY:		// Receipt paper is ok.(Near Empty)
        m_bStatePaper = TRUE;
		break;
	}

	if( m_bStatePaper && ( m_bStateCover || !m_bCoverSensor ) )
	{
        bRecEnb = TRUE;
	}else
	{
        bRecEnb = FALSE;
	}

	GetDlgItem(IDC_BTN_REC1)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_REC2)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_REC3)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_REC4)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_REC5)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_REC6)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_SLP1)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_REC1)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_DIO1)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_DIO2)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_MC_RESET)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_MC_GET)->EnableWindow(bRecEnb);
	GetDlgItem(IDC_BTN_MC_CUMULATIVE)->EnableWindow(bRecEnb);

	//Check on rotate print function
	if( !m_Ptr1.GetCapRecLeft90() )
	{
		GetDlgItem(IDC_BTN_REC3)->EnableWindow(FALSE);
	}
	//Check on slip function
	if( (!m_Ptr1.GetCapSlpPresent()) || (!m_Ptr1.GetCapSlpFullslip()) )
	{
		GetDlgItem(IDC_BTN_SLP1)->EnableWindow(FALSE);
	}
	//Check on PageMode function
	if( m_Ptr1.GetCapRecPageMode() == FALSE ){
		GetDlgItem(IDC_BTN_REC4)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REC6)->EnableWindow(FALSE);
	}
	//Check on bitmap print function
	if( m_Ptr1.GetCapRecBitmap() == FALSE){
		GetDlgItem(IDC_BTN_REC5)->EnableWindow(FALSE);
		GetDlgItem(IDC_BTN_REC6)->EnableWindow(FALSE);
	}
	// Check Multi-tone Function
	pData = PTR_DI_BITMAP_PRINTING_MULTI_TONE;
	pData2 = PTR_DI_BITMAP_PRINTING_NORMAL;
	cString = "";
	pString = cString.AllocSysString();
	m_Ptr1.DirectIO( PTR_DI_SET_BITMAP_PRINTING_TYPE, &pData, &pString );
	SysFreeString( pString );
	if( m_Ptr1.GetResultCode() == OPOS_SUCCESS) {
		m_Ptr1.DirectIO( PTR_DI_SET_BITMAP_PRINTING_TYPE, &pData2, &pString );
	}
	else {
		GetDlgItem(IDC_BTN_REC6)->EnableWindow(FALSE);
	}
}


void CPrinterDlg::OnBtnRetrievSt() 
{
	CString	strParam;
	CString	strErrMsg;
	CString	strXMLPath;
	BSTR	bstrParam;

    m_edtRetrieveSt.GetWindowText(strParam);
    strErrMsg.Empty();
	bstrParam = strParam.AllocSysString();

    // Obtains the statistics of the device and stores it in a file.
	m_Ptr1.RetrieveStatistics( &bstrParam );
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS )
	{
		CString	strTemp;
		strErrMsg  = _T("RetrieveStatistics method error.\n\n");
		strTemp.Format("%d", m_Ptr1.GetResultCode() );
		strErrMsg += _T("ResultCode = ") + strTemp + _T("\n");
		strTemp.Format("%d", m_Ptr1.GetResultCodeExtended() );
		strErrMsg += _T("ResultCodeExtended = ") + strTemp;
		MessageBox( strErrMsg );
		::SysFreeString( bstrParam );
		return;
	}
    
    strXMLPath = _T("Sample.xml");
	strParam = bstrParam;
	::SysFreeString( bstrParam );

	CFile cfXMLFile( strXMLPath, CFile::modeCreate | CFile::modeWrite );
	strXMLPath = cfXMLFile.GetFilePath();
	cfXMLFile.Write( strParam, strParam.GetLength() );
	cfXMLFile.Close();

	// Opens another window and indicates the information of the XML file.
	CXMLView cxmlDlg;
	cxmlDlg.SetXMLFilePath( strXMLPath );
    cxmlDlg.DoModal();
}

////////////////////////////////////////////////////////////////////////////////
//	Print memory bitmap
//
void CPrinterDlg::OnBtnRec5() 
{
	BOOL		bRet;
	CFile		BitmapFile;
	CString		strBitmapData;
	BYTE		byBuffer;
	CString 	sRC;
	CString 	sRCE;

	// Read bitmap file
	bRet = BitmapFile.Open("Logo.bmp", CFile::modeRead);
	if (bRet == FALSE) {
		MessageBox("Cannot open bitmap file.");
		return;
	}
	
	strBitmapData.Empty();
	while (BitmapFile.Read(&byBuffer, sizeof(BYTE)) == sizeof(BYTE)) {
		strBitmapData += TCHAR(0x30 + ((byBuffer >> 4) & 0x0F));
		strBitmapData += TCHAR(0x30 + (byBuffer & 0x0F));
	}

	BitmapFile.Close();

	// Print memory bitmap
	m_Ptr1.SetBinaryConversion(OPOS_BC_NIBBLE);
	m_Ptr1.PrintMemoryBitmap(PTR_S_RECEIPT, strBitmapData, PTR_BMT_BMP,
							 m_Ptr1.GetRecLineWidth() / 2, PTR_BM_CENTER);
	if( m_Ptr1.GetResultCode() != OPOS_SUCCESS ) {
		sRC.Format("%ld", m_Ptr1.GetResultCode());
		sRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
		MessageBox("Cannot use a POS Printer\nResultCode = " + sRC + "\nResultCodeExtended = " + sRCE );
	}
	m_Ptr1.SetBinaryConversion(OPOS_BC_NONE);
}

////////////////////////////////////////////////////////////////////////////////
//	Multi-tone Print
//
void CPrinterDlg::OnBtnRec6() 
{
	long lPMDescriptorList[3];
	long lGetPMDescriptor, lCount;
	long lVPosition;
	long pData;
    CString cString;
	BSTR pString;
	CString sRC;
	CString sRCE;

	BOOL bBarcodePrint;
	CString ESC = "\x1b";
	CString fDate;
	CString BcData;
	CString strOutputData, strRC, strRCE;
	CString strPMArea, strMaxHArea, strMaxVArea, strSetHPositon, strSetVPosition;

	if( m_Ptr1.GetCapRecPresent() == FALSE ) {
		MessageBox("This Printer doesn't have Receipt Station.");
		return;
	}
	if( m_Ptr1.GetCapRecPageMode() == FALSE ) {
		MessageBox("This printer doesn't have a PageMode printing function.");
		return;
	}

	// Initialization
	CTime t = CTime::GetCurrentTime();
	fDate = t.Format("%b %d, %Y  %p %I:%M");
	BcData = "4902720005074";

	lPMDescriptorList[0] = PTR_PM_BM_ROTATE;
    lPMDescriptorList[1] = PTR_PM_BC_ROTATE;
    lPMDescriptorList[2] = PTR_PM_OPAQUE;

	// Set Multi-tone Function
	pData = PTR_DI_BITMAP_PRINTING_MULTI_TONE;
	cString = "";
	pString = cString.AllocSysString();
	m_Ptr1.DirectIO( PTR_DI_SET_BITMAP_PRINTING_TYPE, &pData, &pString );
	SysFreeString( pString );


	// PrintBitMap
	m_Ptr1.PrintBitmap(PTR_S_RECEIPT, "sample.bmp", m_Ptr1.GetRecLineWidth() , PTR_BM_CENTER);

	// Select of target station of PageMode
	m_Ptr1.SetPageModeStation(PTR_S_RECEIPT);
    lGetPMDescriptor = m_Ptr1.GetPageModeDescriptor();

    for(lCount = 2;lCount >= 0;lCount--){
		if(lPMDescriptorList[lCount] <= lGetPMDescriptor){
			lGetPMDescriptor = lGetPMDescriptor - lPMDescriptorList[lCount];
			switch (lCount){
				case 1:
					if (m_Ptr1.GetCapRecBarCode()) {
						if (strstr(m_Ptr1.GetRecBarCodeRotationList(), "R90") != NULL)
						{
							bBarcodePrint = true;
						}
					}
					break;
			}
		}
	}

	// PageMode
	m_Ptr1.PageModePrint(PTR_PM_PAGE_MODE);
	// Initialization of PageMode area
	m_Ptr1.SetPageModePrintArea("0,0,0,0");
	m_Ptr1.SetPageModeHorizontalPosition(0);
	m_Ptr1.SetPageModeVerticalPosition(0);
        
	m_Ptr1.SetPageModePrintDirection(PTR_PD_LEFT_TO_RIGHT);
	strPMArea = m_Ptr1.GetPageModeArea();
	// Gets the maximum size of PageMode area
	lCount = strPMArea.Find(",");
	strMaxHArea = strPMArea.Left(lCount);
	strMaxVArea = strPMArea.Right(strPMArea.GetLength() - (lCount + 1));
	// PageMode area
	lVPosition = m_Ptr1.GetRecLineSpacing() * 2;
	strSetVPosition.Format("%d", lVPosition);
	strPMArea = "0,0," + strMaxHArea + "," + strSetVPosition;
	m_Ptr1.SetPageModePrintArea(strPMArea);
        
	// Right90
	lVPosition = atoi(strMaxVArea);
	if (lVPosition > 12000){
		// Setting of Vertical Maximum value
		strMaxVArea = "12000";
	}
	// PageMode area
	strPMArea = "0," + strSetVPosition + "," + strMaxHArea + ",";
	lCount = atoi(strMaxVArea);
	lVPosition = atoi(strSetVPosition);
	lVPosition = lCount - lVPosition;
	strSetVPosition.Format("%d", lVPosition);
	strPMArea = strPMArea + strSetVPosition;
	m_Ptr1.SetPageModePrintArea(strPMArea);
	m_Ptr1.SetPageModePrintDirection(PTR_PD_TOP_TO_BOTTOM);
	
	m_Ptr1.SetPageModeHorizontalPosition(m_Ptr1.GetRecLineWidth() / 4);
	m_Ptr1.SetPageModeVerticalPosition(m_Ptr1.GetRecLineSpacing());
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|4CCoupon ticket" + "\n");
        
	m_Ptr1.SetPageModeVerticalPosition(0);
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|rA123xxStreet,xxCity,xxState" + "\n");
	m_Ptr1.SetPageModeVerticalPosition(m_Ptr1.GetRecLineSpacing());
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|rATEL 9999-99-9999" + "\n");
	m_Ptr1.SetPageModeVerticalPosition(m_Ptr1.GetRecLineSpacing() * 2);
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|rA" + fDate + "\n");
        
	m_Ptr1.SetPageModeHorizontalPosition(0);
	lVPosition = m_Ptr1.GetRecLineWidth() / 4; // a criterion value of Vertical position
	m_Ptr1.SetPageModeVerticalPosition(lVPosition);
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, "The following amount will be deducted \nfrom your total sales at the register \nby showing us this coupon.\n");
	m_Ptr1.SetPageModeHorizontalPosition((m_Ptr1.GetRecLineWidth() / m_Ptr1.GetRecLineChars()) * 3);
	m_Ptr1.SetPageModeVerticalPosition(lVPosition + (m_Ptr1.GetRecLineSpacing() * 4));
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|bCper coupon" + "\n");

	m_Ptr1.SetPageModeHorizontalPosition(0);
	m_Ptr1.SetPageModeVerticalPosition(lVPosition + (m_Ptr1.GetRecLineSpacing() * 4));
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|2uC                                    " + "\n");
	m_Ptr1.SetPageModeVerticalPosition(lVPosition + (m_Ptr1.GetRecLineSpacing() * 5));
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|4C" + ESC + "|2uC      $1.00  OFF  " + "\n");
        
	m_Ptr1.SetPageModeHorizontalPosition((m_Ptr1.GetRecLineWidth() / m_Ptr1.GetRecLineChars()) * 9);
	m_Ptr1.SetPageModeVerticalPosition(lVPosition + (m_Ptr1.GetRecLineSpacing() * 7));
	fDate.Format("%d", atoi(t.Format("%Y")) + 1);
	fDate = t.Format("%B %d, ") + fDate;
	m_Ptr1.PrintNormal(PTR_S_RECEIPT, ESC + "|bCExpiration Date : " + fDate + "\n");

	// Printing Barcode
	if (bBarcodePrint) {
		m_Ptr1.SetPageModeHorizontalPosition(0);
		m_Ptr1.SetPageModeVerticalPosition(m_Ptr1.GetRecLineSpacing() * 5);
		m_Ptr1.PrintBarCode(PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 1000, m_Ptr1.GetRecLineWidth() / 3, PTR_BC_RIGHT, PTR_BC_TEXT_BELOW);
	}
        
	m_Ptr1.PageModePrint(PTR_PM_NORMAL);

	if( m_Ptr1.GetResultCode() == OPOS_SUCCESS ) {
		strOutputData.Format( "|%dlF", m_Ptr1.GetRecLinesToPaperCut());
		m_Ptr1.PrintNormal( PTR_S_RECEIPT, ESC + strOutputData);
		if( m_Ptr1.GetCapRecPapercut())
			m_Ptr1.CutPaper( 100 );
	}
	else {
		strRC.Format("%ld", m_Ptr1.GetResultCode());
		strRCE.Format("%ld", m_Ptr1.GetResultCodeExtended());
		MessageBox("Cannot use a POS Printer\nResultCode = " + strRC + "\nResultCodeExtended = " + strRCE );
		m_Ptr1.PageModePrint(PTR_PM_CANCEL);
	}

//	 Free Multi-tone Print Setting
	pData = PTR_DI_BITMAP_PRINTING_NORMAL;
	cString = "";
	pString = cString.AllocSysString();
	m_Ptr1.DirectIO( PTR_DI_SET_BITMAP_PRINTING_TYPE, &pData, &pString );
	SysFreeString( pString );
		
}
