VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Begin VB.Form Step4 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 4  Print barcodes"
   ClientHeight    =   2325
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   3795
   LinkTopic       =   "Form2"
   MaxButton       =   0   'False
   ScaleHeight     =   2325
   ScaleWidth      =   3795
   Begin VB.CommandButton cmdExit 
      Cancel          =   -1  'True
      Caption         =   "Close"
      Height          =   330
      Left            =   2520
      TabIndex        =   2
      Top             =   1680
      Width           =   1065
   End
   Begin VB.Frame Frame1 
      Caption         =   "Receipt"
      Height          =   1170
      Left            =   210
      TabIndex        =   0
      Top             =   210
      Width           =   3375
      Begin VB.CommandButton cmdPrint 
         Caption         =   "Print"
         Height          =   435
         Left            =   315
         TabIndex        =   1
         Top             =   420
         Width           =   2775
      End
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   1800
      OleObjectBlob   =   "Step4.frx":0000
      Top             =   1560
   End
End
Attribute VB_Name = "Step4"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 4  Print barcodes
Option Explicit

Private Sub cmdPrint_Click()

    Dim ESC As String * 1
    Dim fDate As String
    Dim BcData  As String

    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    BcData = "4902720005074"

    With OPOSPOSPrinter1
        .PrintNormal PTR_S_RECEIPT, ESC + "|1B"
        .PrintNormal PTR_S_RECEIPT, ESC + "|N" + "123xxstreet,xxxcity,xxxxstate " + vbLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|rA" + "TEL 9999-99-9999   C#2" + vbLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|cA" + fDate + vbCrLf + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "apples                  $20.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "grapes                  $30.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "bananas                 $40.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "lemons                  $50.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "oranges                 $60.00" + vbCrLf + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|bC" + "Tax excluded.          $200.00" + ESC + "|N" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + "Tax  5.0%               $10.00" + ESC + "|N" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|bC" + ESC + "|2C" + "Total   $210.00" + ESC + "|N" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "Customer's payment     $250.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, "Change                  $40.00" + vbCrLf + vbCrLf
        
        ' Barcode printing
        .PrintBarCode PTR_S_RECEIPT, BcData, PTR_BCS_JAN13, 30, .RecLineWidth, PTR_BC_CENTER, PTR_BC_TEXT_BELOW

        .PrintNormal PTR_S_RECEIPT, ESC + "|fP"
    End With

End Sub


Private Sub cmdExit_Click()

    Unload Me

End Sub


Private Sub Form_Load()

    With OPOSPOSPrinter1
        .Open "Unit1"
        .ClaimDevice 1000
        .DeviceEnabled = True
        
        .RecLetterQuality = True
        
        .SetBitmap 1, PTR_S_RECEIPT, App.Path + "\Logo.bmp", PTR_BM_ASIS, PTR_BM_CENTER
    End With

End Sub


Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub


