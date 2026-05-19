VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Begin VB.Form Step1 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 1  Print ""Hello OPOS"""
   ClientHeight    =   1590
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   3795
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   ScaleHeight     =   1590
   ScaleWidth      =   3795
   Begin VB.CommandButton cmdPrint 
      Caption         =   "Print"
      Height          =   450
      Left            =   1155
      TabIndex        =   0
      Top             =   525
      Width           =   1515
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   3000
      OleObjectBlob   =   "Step1.frx":0000
      Top             =   960
   End
End
Attribute VB_Name = "Step1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 1  Print as "Hello OPOS"

Option Explicit

Private Sub cmdPrint_Click()

'As using the PrintNormal method, send strings to a printer, and print it
'[vbCrLf] is the standard code for starting a new line.
    OPOSPOSPrinter1.PrintNormal PTR_S_RECEIPT, "Hello OPOS" + vbCrLf

End Sub


Private Sub Form_Load()

    With OPOSPOSPrinter1
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        
        'Get the exclusive control right for the opened device.
        'Then the device is disable from other application.
        
        '(Notice:When using an old CO, use the Claim.)
        .ClaimDevice 1000
        
        'Enable the device.
        .DeviceEnabled = True
    End With

End Sub


Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        'Cancel the device
        .DeviceEnabled = False
        
        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice
        
        'Finish using the device.
        .Close
    End With

End Sub


