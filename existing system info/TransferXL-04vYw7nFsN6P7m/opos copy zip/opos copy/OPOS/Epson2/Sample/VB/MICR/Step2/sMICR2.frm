VERSION 5.00
Object = "{CCB90110-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSMICR.ocx"
Begin VB.Form Step2 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 2 Adding ""Time-out"" function."
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
      Left            =   5040
      OleObjectBlob   =   "sMICR2.frx":0000
      Top             =   600
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
Attribute VB_Name = "Step2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 2 Adding Time-out function.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub Command1_Click()

    While OPOSMICR1.BeginInsertion(3000) = OPOS_E_TIMEOUT
        If (MsgBox("Please insert a check.", vbOKCancel + vbQuestion) = vbCancel) Then
            OPOSMICR1.EndInsertion
            Exit Sub
        End If
    Wend
    OPOSMICR1.EndInsertion

End Sub

Private Sub Command2_Click()

    If OPOSMICR1.BeginRemoval(3000) = OPOS_E_TIMEOUT Then
        MsgBox "Please remove a check."
    End If

    While OPOSMICR1.EndRemoval <> OPOS_SUCCESS
        MsgBox "Please remove a check."
    Wend

End Sub

Private Sub Form_Load()

    With OPOSMICR1
        .Open "Unit1"
        .ClaimDevice 1000
        .DeviceEnabled = True
        .DataEventEnabled = True
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSMICR1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

Private Sub OPOSMICR1_DataEvent(ByVal Status As Long)

    Text1.Text = OPOSMICR1.RawData

    OPOSMICR1.DataEventEnabled = True

End Sub

