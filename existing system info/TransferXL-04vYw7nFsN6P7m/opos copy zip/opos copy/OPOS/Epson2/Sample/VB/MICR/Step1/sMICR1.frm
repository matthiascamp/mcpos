VERSION 5.00
Object = "{CCB90110-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSMICR.ocx"
Begin VB.Form Step1 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 1 Normal operation: Display the read data."
   ClientHeight    =   1695
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   6210
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   1695
   ScaleWidth      =   6210
   Begin VB.CommandButton Command2 
      Caption         =   "Remove"
      Height          =   435
      Left            =   3150
      TabIndex        =   4
      Top             =   840
      Width           =   1275
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Insert"
      Height          =   435
      Left            =   1260
      TabIndex        =   3
      Top             =   840
      Width           =   1275
   End
   Begin VB.TextBox Text1 
      Height          =   285
      Left            =   1260
      TabIndex        =   2
      Top             =   315
      Width           =   3165
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Exit"
      Height          =   345
      Left            =   4830
      TabIndex        =   1
      Top             =   105
      Width           =   1200
   End
   Begin OposMICR_CCOCtl.OPOSMICR OPOSMICR1 
      Left            =   5160
      OleObjectBlob   =   "sMICR1.frx":0000
      Top             =   720
   End
   Begin VB.Label Label6 
      Alignment       =   1  'Right Justify
      Caption         =   "RawData"
      Height          =   225
      Left            =   210
      TabIndex        =   0
      Top             =   315
      Width           =   960
   End
End
Attribute VB_Name = "Step1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 1 Normal operation: Display the read data.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub Command1_Click()
    
    OPOSMICR1.BeginInsertion 0
    
    OPOSMICR1.EndInsertion

End Sub

Private Sub Command2_Click()

    OPOSMICR1.BeginRemoval 0

End Sub

Private Sub Form_Load()

    With OPOSMICR1
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        
        'Get the exclusive control right for the opened device.
        'Then the device is disable from other application.
        
        '(Notice:When using an old CO, use the Claim.)
        .ClaimDevice 1000
        
        'Enable the device.
        .DeviceEnabled = True
        
        .DataEventEnabled = True
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSMICR1
        'Cancel the device
        .DeviceEnabled = False
        
        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice
        
        'Finish using the device.
        .Close
    End With

End Sub

Private Sub OPOSMICR1_DataEvent(ByVal Status As Long)

    Text1.Text = OPOSMICR1.RawData

    OPOSMICR1.DataEventEnabled = True

End Sub

