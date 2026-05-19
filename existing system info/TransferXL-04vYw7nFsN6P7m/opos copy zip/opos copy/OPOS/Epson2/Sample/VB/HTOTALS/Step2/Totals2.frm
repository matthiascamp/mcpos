VERSION 5.00
Object = "{CCB90080-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSTotals.ocx"
Begin VB.Form Step2 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 2 Read the data from the file created earlier."
   ClientHeight    =   1695
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   5475
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   1695
   ScaleWidth      =   5475
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4305
      TabIndex        =   3
      Top             =   105
      Width           =   990
   End
   Begin VB.TextBox Text1 
      BackColor       =   &H8000000F&
      Height          =   270
      Left            =   315
      Locked          =   -1  'True
      TabIndex        =   1
      Top             =   420
      Width           =   3690
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Read"
      Height          =   450
      Left            =   2520
      TabIndex        =   0
      Top             =   840
      Width           =   1500
   End
   Begin OposTotals_CCOCtl.OPOSTotals OPOSTotals1 
      Left            =   4560
      OleObjectBlob   =   "Totals2.frx":0000
      Top             =   720
   End
   Begin VB.Label Label1 
      Caption         =   "Step 1 read registered data."
      Height          =   225
      Left            =   315
      TabIndex        =   2
      Top             =   210
      Width           =   3060
   End
End
Attribute VB_Name = "Step2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 2 Read the data from the file created earlier.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub


Private Sub Command1_Click()

    Dim pHandle As Long
    Dim pSize As Long
    Dim pData As String
    
    pData = ""

    OPOSTotals1.Find "Step1", pHandle, pSize
    OPOSTotals1.Read pHandle, pData, 0, pSize
    Text1.Text = pData

End Sub

Private Sub Form_Load()

    With OPOSTotals1
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

    With OPOSTotals1
        'Cancel the device
        .DeviceEnabled = False
        
        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice
        
        'Finish using the device.
        .Close
    End With

End Sub


